import * as AWS from 'aws-sdk';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { IOpsDeployment, IOpsNetwork } from '@5qtrs/ops-data';
import { randomBytes } from 'crypto';
import { debug } from './OpsDebug';
import Migrations from './OpsDatabaseMigrations';

export interface IDatabaseCredentials {
  resourceArn: string;
  secretArn: string;
}

export async function createDatabase(
  config: OpsDataAwsConfig,
  awsConfig: IAwsConfig,
  deployment: IOpsDeployment,
  network: IOpsNetwork
): Promise<IDatabaseCredentials> {
  debug('IN CREATE DATABASE');
  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();

  const awsCredentials = {
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };

  const rds = new AWS.RDS({
    apiVersion: '2014-10-31',
    ...awsCredentials,
  });

  const ec2 = new AWS.EC2({
    apiVersion: '2016-11-15',
    ...awsCredentials,
  });

  const secretsmanager = new AWS.SecretsManager({
    apiVersion: '2017-10-17',
    ...awsCredentials,
  });

  const rdsData = new AWS.RDSDataService({
    apiVersion: '2018-08-01',
    ...awsCredentials,
  });

  const getClusterIdentifier = () => `fusebit-db-${deployment.deploymentName}`;
  const getSubnetGroupName = () => `fusebit-db-subnet-group-${deployment.deploymentName}`;
  const getSecurityGroupName = () => `fusebit-db-security-group-${deployment.deploymentName}`;
  const getSecretName = () => `fusebit-db-secret-${deployment.deploymentName}`;
  const getCommonTags = () => [
    { Key: 'fuseopsVersion', Value: process.env.FUSEOPS_VERSION },
    { Key: 'fusebitDeployment', Value: deployment.deploymentName },
    { Key: 'account', Value: awsConfig.account },
  ];

  const tryGetAuroraCluster = async (): Promise<AWS.RDS.DBCluster | undefined> => {
    const params = {
      DBClusterIdentifier: getClusterIdentifier(),
    };
    try {
      const data = await rds.describeDBClusters(params).promise();
      return data.DBClusters && data.DBClusters[0];
    } catch (e) {
      if (e.code === 'DBClusterNotFoundFault') {
        return undefined;
      }
      throw e;
    }
  };

  const createOrGetDBSubnetGroupName = async (): Promise<string> => {
    debug('IN CREATE OR GET DB SUBNET GROUP');
    const subnetGroupName = getSubnetGroupName();
    const params = {
      DBSubnetGroupDescription: `DB Subnet Group for Aurora cluster '${getClusterIdentifier()}'`,
      DBSubnetGroupName: subnetGroupName,
      SubnetIds: network.existingPrivateSubnetIds || network.privateSubnets.map((s) => s.id),
      Tags: getCommonTags(),
    };
    try {
      await rds.createDBSubnetGroup(params).promise();
    } catch (e) {
      if (e.code !== 'DBSubnetGroupAlreadyExists') {
        throw e;
      }
    }
    return subnetGroupName;
  };

  const createOrGetDBSecurityGroups = async (): Promise<string[]> => {
    debug('IN CREATE OR GET SECURITY GROUP');
    const params = {
      Filters: [
        {
          Name: 'vpc-id',
          Values: [network.existingVpcId || network.vpcId],
        },
        {
          Name: 'group-name',
          Values: [getSecurityGroupName()],
        },
      ],
    };
    const data = await ec2.describeSecurityGroups(params).promise();
    if (data.SecurityGroups && data.SecurityGroups[0]) {
      return [data.SecurityGroups[0].GroupId as string];
    }
    const params1 = {
      Description: `DB Security Group for Aurora cluster ${getClusterIdentifier()}`,
      GroupName: getSecurityGroupName(),
      VpcId: network.existingVpcId || network.vpcId,
    };
    const data1 = await ec2.createSecurityGroup(params1).promise();
    const params3 = {
      Resources: [data1.GroupId as string],
      Tags: [...getCommonTags(), { Key: 'Name', Value: getSecurityGroupName() }],
    };
    await ec2.createTags(params3).promise();
    return [data1.GroupId as string];
  };

  const createAuroraCluster = async (): Promise<IDatabaseCredentials> => {
    debug('IN CREATE CLUSTER');
    const subnetGroupName = await createOrGetDBSubnetGroupName();
    const securityGroups = await createOrGetDBSecurityGroups();
    const password = randomBytes(41).toString('base64').replace(/\//g, '+').substring(0, 40);
    const params = {
      DBClusterIdentifier: getClusterIdentifier(),
      Engine: 'aurora-postgresql',
      EngineVersion: '10.7',
      DatabaseName: config.auroraDatabaseName,
      MasterUsername: config.auroraMasterUsername,
      MasterUserPassword: password,
      DBSubnetGroupName: subnetGroupName,
      StorageEncrypted: true,
      EngineMode: 'serverless',
      EnableHttpEndpoint: true,
      CopyTagsToSnapshot: true,
      ScalingConfiguration: {
        AutoPause: false,
        MinCapacity: 2,
        MaxCapacity: 384,
      },
      VpcSecurityGroupIds: securityGroups,
      Tags: getCommonTags(),
    };
    const data = await rds.createDBCluster(params).promise();

    const storeDatabaseCredentials = async (cluster: AWS.RDS.DBCluster): Promise<string> => {
      const name = getSecretName();
      const params = {
        Name: `rds-db-credentials/${name}-${randomBytes(10).toString('hex')}`,
        Description: `DB Credentials for Aurora cluster ${getClusterIdentifier()}`,
        SecretString: JSON.stringify({
          dbInstanceIdentifier: cluster.DBClusterIdentifier,
          engine: cluster.Engine,
          host: cluster.Endpoint,
          port: cluster.Port,
          resourceId: cluster.DbClusterResourceId,
          username: cluster.MasterUsername,
          password,
        }),
        Tags: [
          ...getCommonTags(),
          { Key: 'Name', Value: name },
          { Key: 'dbArn', Value: cluster.DBClusterArn as string },
        ],
      };
      const data = await secretsmanager.createSecret(params).promise();
      return data.ARN as string;
    };

    const waitForCluster = async (n: number): Promise<IDatabaseCredentials> => {
      if (n <= 0) {
        throw new Error(`Timed out waiting for the Aurora cluster to become available.`);
      }
      const cluster = await tryGetAuroraCluster();
      debug('CLUSTER STATUS', n, cluster && cluster.Status);
      if (!cluster || cluster.Status === 'creating') {
        await new Promise((resolve) => setTimeout(() => resolve(undefined), 30000));
        return await waitForCluster(n - 1);
      }

      if (cluster.Status === 'available') {
        const secretArn = await storeDatabaseCredentials(cluster);
        return {
          resourceArn: cluster.DBClusterArn as string,
          secretArn,
        };
      }

      throw new Error(
        `Error creating Aurora cluster. Expected status of 'available' but arrived at '${cluster.Status}'.`
      );
    };

    return await waitForCluster(20);
  };

  const runDatabaseMigrations = async (dbCredentials: IDatabaseCredentials) => {
    const commonParams = {
      ...dbCredentials,
      database: config.auroraDatabaseName,
    };
    const params: AWS.RDSDataService.ExecuteStatementRequest = {
      ...commonParams,
      sql: 'select version from schemaVersion;',
    };
    let data: AWS.RDSDataService.ExecuteStatementResponse;
    let currentSchemaVersion = -1;
    try {
      data = await rdsData.executeStatement(params).promise();
      if (!data.records || !data.records[0] || !data.records[0][0] || data.records[0][0].longValue === undefined) {
        throw new Error('Unable to determine the schema version of the Aurora database.');
      }
      currentSchemaVersion = data.records[0][0].longValue;
    } catch (e) {
      if (e.code !== 'BadRequestException') {
        throw e;
      }
    }
    debug('DATABASE SCHEMA VERSION', currentSchemaVersion);

    if (Migrations[currentSchemaVersion + 1] === undefined) {
      debug('DATABASE SCHEMA IS UP TO DATE');
      return undefined;
    }

    const migrationError = async (n: number, transactionId: string, error: any) => {
      try {
        await rdsData.rollbackTransaction({ ...dbCredentials, transactionId }).promise();
        debug('ROLLBACK MIGRATION SUCCESS', n);
      } catch (e) {
        debug('ROLLBACK MIGRATION ERROR', n, error);
        throw e;
      }
      throw error;
    };

    const runMigration = async (n: number): Promise<void> => {
      debug('STARTING MIGRATION', n);
      const { transactionId } = await rdsData.beginTransaction(commonParams).promise();
      try {
        params.sql = Migrations[n];
        params.transactionId = transactionId as string;
        const data = await rdsData.executeStatement(params).promise();
        params.sql = `update schemaVersion set version = ${n} where version = ${n - 1};`;
        const result = await rdsData.executeStatement(params).promise();
        if (result.numberOfRecordsUpdated !== 1) {
          throw new Error(`Unable to persist the database schema version ${n}`);
        }
        debug('MIGRATION EXECUTION SUCCESS', n, data && JSON.stringify(data, null, 2));
      } catch (e) {
        debug('MIGRATION EXECUTION ERROR', n, e);
        return await migrationError(n, transactionId as string, e);
      }
      await rdsData.commitTransaction({ ...dbCredentials, transactionId: params.transactionId as string }).promise();
      debug('COMMITED MIGRATION', n);
      return Migrations[n + 1] === undefined ? undefined : await runMigration(n + 1);
    };

    return await runMigration(currentSchemaVersion + 1);
  };

  const updateAuroraCluster = async (cluster: AWS.RDS.DBCluster): Promise<IDatabaseCredentials> => {
    debug('IN UPDATE CLUSTER', cluster);
    // FUTURE: this is where versioning of Aurora cluster configuration happens, informed by cluster.Tags['fuseopsVersion']
    // For now, do nothing and return current configuration.
    const dbCredentials = await getDatabaseCredentials(awsConfig, deployment.deploymentName);
    return dbCredentials;
  };

  const cluster = await tryGetAuroraCluster();
  const dbCredentials = cluster ? await updateAuroraCluster(cluster) : await createAuroraCluster();
  await runDatabaseMigrations(dbCredentials);

  return dbCredentials;
}

export async function getDatabaseCredentials(
  awsConfig: IAwsConfig,
  deploymentName: string
): Promise<IDatabaseCredentials> {
  debug('IN GET DATABASE CREDENTIALS');

  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  const secretsmanager = new AWS.SecretsManager({
    apiVersion: '2017-10-17',
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  });

  const params = {
    Filters: [
      { Key: 'tag-key', Values: ['fusebitDeployment'] },
      { Key: 'tag-value', Values: [deploymentName] },
    ],
  };
  const data = await secretsmanager.listSecrets(params).promise();
  debug('LIST SECRETS RESPONSE', data);
  if (!data.SecretList || data.SecretList.length !== 1) {
    throw new Error(
      `Cannot find a unique secret to access Aurora cluster. Expected 1 matching secret, found ${
        data.SecretList ? data.SecretList.length : 0
      }`
    );
  }
  const dbArnTag = data.SecretList[0].Tags?.find((t) => t.Key === 'dbArn');
  if (!dbArnTag) {
    throw new Error(`The secret to access Aurora cluster does not specify the database ARN.`);
  }
  return {
    resourceArn: dbArnTag.Value as string,
    secretArn: data.SecretList[0].ARN as string,
  };
}
