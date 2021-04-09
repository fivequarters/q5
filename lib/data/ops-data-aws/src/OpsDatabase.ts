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
  ];

  const tryGetAuroraCluster = (): Promise<AWS.RDS.DBCluster | undefined> => {
    const params = {
      DBClusterIdentifier: getClusterIdentifier(),
    };
    return new Promise((resolve, reject) => {
      rds.describeDBClusters(params, (error, data) => {
        return error && error.code !== 'DBClusterNotFoundFault'
          ? reject(error)
          : resolve(data && data.DBClusters && data.DBClusters[0]);
      });
    });
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
    return new Promise((resolve, reject) => {
      rds.createDBSubnetGroup(params, (error, data) => {
        return error && error.code !== 'DBSubnetGroupAlreadyExists' ? reject(error) : resolve(subnetGroupName);
      });
    });
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
    return new Promise((resolve, reject) => {
      ec2.describeSecurityGroups(params, (error, data) => {
        debug('DESCRIBE SEC GROUP', error, data);
        if (error) {
          return reject(error);
        }
        if (data.SecurityGroups && data.SecurityGroups[0]) {
          return resolve([data.SecurityGroups[0].GroupId as string]);
        }
        const params = {
          Description: `DB Security Group for Aurora cluster ${getClusterIdentifier()}`,
          GroupName: getSecurityGroupName(),
          VpcId: network.existingVpcId || network.vpcId,
        };
        ec2.createSecurityGroup(params, (error, data) => {
          debug('CREATE GROUP ERRROR', error);
          if (error) {
            return reject(error);
          }
          const params = {
            GroupId: data.GroupId as string,
            IpPermissions: [
              {
                FromPort: 5432,
                ToPort: 5432,
                IpProtocol: 'tcp',
                IpRanges: [{ CidrIp: '0.0.0.0/0' }],
                Ipv6Ranges: [{ CidrIpv6: '::/0' }],
              },
            ],
          };
          ec2.authorizeSecurityGroupIngress(params, (error) => {
            debug('AUTHORIZE ERROR', error);
            if (error) {
              return reject(error);
            }
            const params = {
              Resources: [data.GroupId as string],
              Tags: [...getCommonTags(), { Key: 'Name', Value: getSecurityGroupName() }],
            };
            ec2.createTags(params, (error) => {
              return error ? reject(error) : resolve([data.GroupId as string]);
            });
          });
        });
      });
    });
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
    return new Promise((resolve, reject) => {
      rds.createDBCluster(params, async (error, data) => {
        if (error) {
          return reject(error);
        }

        const storeDatabaseCredentials = async (cluster: AWS.RDS.DBCluster): Promise<string> => {
          const name = getSecretName();
          const params = {
            Name: `${name}-${randomBytes(10).toString('hex')}`,
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
          return new Promise((resolve, reject) => {
            return secretsmanager.createSecret(params, (error, data) => {
              return error ? reject(error) : resolve(data.ARN as string);
            });
          });
        };

        const wairForCluster = async (n: number): Promise<any> => {
          if (n <= 0) {
            return reject(new Error(`Timed out waiting for the Aurora cluster to become available.`));
          }
          let cluster;
          try {
            cluster = await tryGetAuroraCluster();
          } catch (e) {
            return reject(e);
          }
          debug('CLUSTER STATUS', n, cluster && cluster.Status);
          if (!cluster || cluster.Status === 'creating') {
            return setTimeout(() => wairForCluster(n - 1), 30000);
          } else if (cluster.Status === 'available') {
            let secretArn;
            try {
              secretArn = await storeDatabaseCredentials(cluster);
            } catch (e) {
              return reject(e);
            }
            return resolve({
              resourceArn: cluster.DBClusterArn as string,
              secretArn,
            });
          } else {
            return reject(
              new Error(
                `Error creating Aurora cluster. Expected status of 'available' but arrived at '${cluster.Status}'.`
              )
            );
          }
        };

        return wairForCluster(20);
      });
    });
  };

  const runDatabaseMigrations = async (dbCredentials: IDatabaseCredentials) => {
    const commonParams = {
      ...dbCredentials,
      database: config.auroraDatabaseName,
    };
    const params: AWS.RDSDataService.ExecuteStatementRequest = {
      ...commonParams,
      sql: 'select * from schemaVersion;',
    };
    return new Promise((resolve, reject) => {
      return rdsData.executeStatement(params, (error, data) => {
        let currentSchemaVersion = -1;
        if (error && error.code !== 'BadRequestException') {
          return reject(error);
        } else if (!error) {
          if (
            !data ||
            !data.records ||
            !data.records[0] ||
            !data.records[0][0] ||
            data.records[0][0].longValue === undefined
          ) {
            return reject(new Error('Unable to determine the schema version of the Aurora database.'));
          }
          currentSchemaVersion = data.records[0][0].longValue;
        }

        debug('DATABASE SCHEMA VERSION', currentSchemaVersion);
        if (Migrations[currentSchemaVersion + 1] === undefined) {
          debug('DATABASE SCHEMA IS UP TO DATE');
          return resolve(undefined);
        }

        const migrationError = (n: number, transactionId: string, error: any) => {
          return rdsData.rollbackTransaction({ ...dbCredentials, transactionId }, (e1, d1) => {
            debug('ROLLBACK MIGRATION RESULT', n, e1, d1);
            return reject(error);
          });
        };

        const runMigration = (n: number) => {
          debug('STARTING MIGRATION', n);
          rdsData.beginTransaction(commonParams, (error, data) => {
            if (error) {
              return reject(error);
            }
            params.sql = Migrations[n];
            params.transactionId = data.transactionId as string;
            rdsData.executeStatement(params, (error, data) => {
              debug('MIGRATION EXECUTION RESULT', n, error, data && JSON.stringify(data, null, 2));
              if (error) {
                return migrationError(n, params.transactionId as string, error);
              }
              params.sql = `update schemaVersion set version = ${n};`;
              rdsData.executeStatement(params, (error, data) => {
                if (error) {
                  return migrationError(n, params.transactionId as string, error);
                }
                rdsData.commitTransaction(
                  { ...dbCredentials, transactionId: params.transactionId as string },
                  (error) => {
                    if (error) {
                      return migrationError(n, params.transactionId as string, error);
                    }
                    debug('COMMITED MIGRATION', n);
                    return Migrations[n + 1] === undefined ? resolve(undefined) : runMigration(n + 1);
                  }
                );
              });
            });
          });
        };

        runMigration(currentSchemaVersion + 1);
      });
    });
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

  return new Promise((resolve, reject) => {
    return secretsmanager.listSecrets(params, (error, data) => {
      debug('LIST SECRETS RESPONSE', error, data);
      if (error) {
        return reject(error);
      }
      if (!data.SecretList || data.SecretList.length !== 1) {
        return reject(
          new Error(
            `Cannot find a unique secret to access Aurora cluster. Expected 1 matching secret, found ${
              data.SecretList ? data.SecretList.length : 0
            }`
          )
        );
      }
      const dbArnTag = data.SecretList[0].Tags?.find((t) => t.Key === 'dbArn');
      if (!dbArnTag) {
        return reject(new Error(`The secret to access Aurora cluster does not specify the database ARN.`));
      }
      return resolve({
        resourceArn: dbArnTag.Value as string,
        secretArn: data.SecretList[0].ARN as string,
      });
    });
  });
}
