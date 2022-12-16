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
    { Key: 'fusebit-backup-enabled', Value: 'true' },
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
      EngineVersion: '11.17',
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
    await rds.createDBCluster(params).promise();

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
      sql: 'SELECT version FROM schemaVersion;',
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

    const migrationError = async (n: number, transactionId: string | false, error: any) => {
      if (!transactionId) {
        debug('NON TRANSACTIONAL MIGRATION ERROR', n);
        throw new Error(`Failed to apply migration ${n}; aborting. Manual action needed.`);
      }
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

      const isTransactional = Migrations[n].split('\n')[0] !== '-- No Transaction';
      debug(`Migration is${isTransactional ? '' : ' NOT'} in a transaction`);
      let transactionId;

      // Certain migrations might require that they be run outside of a transaction.
      // The primary culprit being updates to existing enum values
      //
      // If the first line of a migration file is the commented line `-- No Transaction`,
      // we will run the migration without the transactional wrapper.
      //
      // This should only be used when absolutely necessary.
      if (isTransactional) {
        transactionId = (await rdsData.beginTransaction(commonParams).promise()).transactionId;
        params.transactionId = transactionId as string;
      } else {
        // Remove the transaction id so it doesn't get used in the this migration.
        delete params.transactionId;
      }

      try {
        params.sql = Migrations[n];
        const updateResult = await rdsData.executeStatement(params).promise();

        params.sql = `UPDATE schemaVersion SET version = :schemaVersion, fuse_ops_version = :fuseOpsVersion WHERE version = :schemaVersion - 1;`;
        params.parameters = [
          { name: 'schemaVersion', value: { longValue: n } },
          { name: 'fuseOpsVersion', value: { stringValue: process.env.FUSEOPS_VERSION || '' } },
        ];
        const result = await rdsData.executeStatement(params).promise();
        if (result.numberOfRecordsUpdated !== 1) {
          throw new Error(`Mismatched schema version when updating to ${n}`);
        }
        debug('MIGRATION EXECUTION SUCCESS', n, updateResult && JSON.stringify(updateResult, null, 2));
      } catch (e) {
        debug('MIGRATION EXECUTION ERROR', n, e);
        return migrationError(n, isTransactional && (transactionId as string), e);
      }
      if (isTransactional) {
        await rdsData.commitTransaction({ ...dbCredentials, transactionId: params.transactionId as string }).promise();
      }
      debug('COMMITED MIGRATION', n);
      return Migrations[n + 1] === undefined ? undefined : runMigration(n + 1);
    };

    return runMigration(currentSchemaVersion + 1);
  };

  const updateAuroraCluster = async (dbCluster: AWS.RDS.DBCluster): Promise<IDatabaseCredentials> => {
    debug('IN UPDATE CLUSTER', dbCluster);
    // FUTURE: this is where versioning of Aurora cluster configuration happens, informed by
    // cluster.Tags['fuseopsVersion'].
    // For now, do nothing and return current configuration.
    return getDatabaseCredentials(awsConfig, deployment.deploymentName);
  };

  const ensureTags = async (arn: string) => {
    return rds
      .addTagsToResource({
        ResourceName: arn,
        Tags: getCommonTags(),
      })
      .promise();
  };
  const auroraCluster = await tryGetAuroraCluster();
  if (auroraCluster) {
    await ensureTags(auroraCluster.DBClusterArn as string);
  }
  const dbCredentials = auroraCluster ? await updateAuroraCluster(auroraCluster) : await createAuroraCluster();
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

  if (!data.SecretList) {
    throw new Error(
      `Cannot find a unique secret to access Aurora cluster in the Secrets Manager. Expected 1 matching secret, found 0. Delete the Aurora cluster and try again.`
    );
  }
  let filteredSecrets: AWS.SecretsManager.SecretListEntry[] = [];

  for (const secret of data.SecretList) {
    if (secret.Name?.match(`^rds-db-credentials/fusebit-db-secret-${deploymentName}-[a-zA-Z0-9]{20}$`)) {
      filteredSecrets.push(secret);
    }
  }

  debug('LIST SECRETS RESPONSE', data);
  if (filteredSecrets.length !== 1) {
    throw new Error(
      `Cannot find a unique secret to access Aurora cluster in the Secrets Manager. Expected 1 matching secret, found ${
        filteredSecrets.length !== 0 ? filteredSecrets.length : '0. Delete the Aurora cluster and try again'
      }`
    );
  }
  const dbArnTag = filteredSecrets[0].Tags?.find((t) => t.Key === 'dbArn');
  if (!dbArnTag) {
    throw new Error(`The secret to access Aurora cluster does not specify the database ARN.`);
  }
  return {
    resourceArn: dbArnTag.Value as string,
    secretArn: filteredSecrets[0].ARN as string,
  };
}
