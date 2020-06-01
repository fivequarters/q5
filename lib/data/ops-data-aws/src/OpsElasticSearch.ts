const superagent = require('superagent');
const fs = require('fs');
import * as AWS from 'aws-sdk';
import { IOpsDeployment, OpsDataException } from '@5qtrs/ops-data';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataTables } from './OpsDataTables';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { debug } from './OpsDebug';

AWS.config.apiVersions = {
  es: '2015-01-01',
  iam: '2010-05-08',
  cloudwatchlogs: '2014-03-28',
};

type ElasticSearchCreds = { username: string; password: string; hostname: string };

const parseElasticSearchUrl = (url: string): ElasticSearchCreds => {
  let esCreds = url.match(/https:\/\/([^:]+):(.*)@([^@]+$)/i);
  if (esCreds && esCreds[1] && esCreds[2] && esCreds[3]) {
    return { username: esCreds[1], password: esCreds[2], hostname: esCreds[3] };
  }

  // Strip off the https
  if (url.startsWith('https://')) {
    return { username: '', password: '', hostname: url.substring('https://'.length) };
  }

  // It's something mysterious, return it blindly.
  return { username: '', password: '', hostname: url };
};

const loadElasticSearchConfigFile = (deployment: IOpsDeployment): any => {
  const fn = deployment.elasticSearch;

  debug('loadElasticSearchConfigFile', fn);

  // If the path doesn't exist, throw.
  if (!fs.existsSync(fn)) {
    throw OpsDataException.invalidElasticSearchUrl(fn);
  }

  try {
    // If the file exists, try to read it.
    return JSON.parse(fs.readFileSync(fn));
  } catch (e) {
    throw OpsDataException.invalidElasticSearchUrl(fn);
  }
};

const createLogGroupName = (deployment: IOpsDeployment) => {
  return `/aws/aes/domains/${deployment.deploymentName}-${deployment.region}-fusebit/application-logs`;
};

const getDefaultElasticSearchConfig = async (
  awsDataConfig: OpsDataAwsConfig,
  awsConfig: IAwsConfig,
  provider: OpsDataAwsProvider,
  tables: OpsDataTables,
  deployment: IOpsDeployment
): Promise<any> => {
  const networkData = await OpsNetworkData.create(awsDataConfig, provider, tables);
  const network = await networkData.get(deployment.networkName, deployment.region);

  let esName = deployment.deploymentName + '-' + deployment.region + '-' + 'fusebit';
  return {
    DomainName: esName,

    ElasticsearchVersion: '7.4',

    CognitoOptions: { Enabled: false },

    DomainEndpointOptions: { EnforceHTTPS: true },

    EBSOptions: { EBSEnabled: true, VolumeType: 'gp2', VolumeSize: 10 },

    ElasticsearchClusterConfig: {
      InstanceType: 'r5.large.elasticsearch',
      InstanceCount: 1,
      DedicatedMasterEnabled: false,
      ZoneAwarenessEnabled: false,
      WarmEnabled: false,
    },

    NodeToNodeEncryptionOptions: {
      Enabled: true,
    },

    AccessPolicies: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        // Allow the analytics lambda to post bulk data
        {
          Effect: 'Allow',
          Principal: {
            AWS: [`${awsDataConfig.arnPrefix}:iam::${awsConfig.account}:role/${awsDataConfig.analyticsRoleName}`],
          },
          Action: ['es:ESHttpPost'],
          Resource: `${awsDataConfig.arnPrefix}:es:${awsConfig.region}:${awsConfig.account}:domain/${esName}/_bulk`,
        },
        // Allow the EC2 function-api full privs
        {
          Effect: 'Allow',
          Principal: {
            AWS: [`${awsDataConfig.arnPrefix}:iam::${awsConfig.account}:role/${awsDataConfig.monoInstanceProfileName}`],
          },
          Action: ['es:*'],
          Resource: `${awsDataConfig.arnPrefix}:es:${awsConfig.region}:${awsConfig.account}:domain/${esName}/*`,
        },
      ],
    }),

    EncryptionAtRestOptions: {
      Enabled: true,
      KmsKeyId: `${awsDataConfig.arnPrefix}:kms:${deployment.region}:${awsConfig.account}:alias/aws/es`,
    },

    LogPublishingOptions: {
      ES_APPLICATION_LOGS: {
        CloudWatchLogsLogGroupArn: `${awsDataConfig.arnPrefix}:logs:${deployment.region}:${
          awsConfig.account
        }:log-group:${createLogGroupName(deployment)}`,
        Enabled: true,
      },
    },

    AdvancedSecurityOptions: {
      Enabled: true,
      InternalUserDatabaseEnabled: false,
      MasterUserOptions: {
        MasterUserARN: `${awsDataConfig.arnPrefix}:iam::${awsConfig.account}:role/${awsDataConfig.monoInstanceProfileName}`,
      },
    },

    VPCOptions: {
      SecurityGroupIds: [network.securityGroupId],
      SubnetIds: [network.privateSubnets.map(sn => sn.id).sort()[0]], // One subnet only on n=1 deployments
    },
  };
};

const waitForElasticSearchReady = async (es: any, esCfg: any): Promise<string> => {
  let prefix = esCfg.AdvancedSecurityOptions.MasterUserOptions.MasterUserName
    ? `https://${esCfg.AdvancedSecurityOptions.MasterUserOptions.MasterUserName}:${esCfg.AdvancedSecurityOptions.MasterUserOptions.MasterUserPassword}@`
    : 'https://';
  let ready = false;
  let delay = 5; // Every 5 seconds
  let attempts = (20 * 60) / delay; // for ~20 minutes
  let result: string;

  while (attempts > 0) {
    // Wait for a delay
    await new Promise(resolve => setTimeout(resolve, delay * 1000));

    attempts -= 1;
    result = await new Promise((resolve, reject) => {
      es.describeElasticsearchDomain({ DomainName: esCfg.DomainName }, async (err: any, data: any) => {
        // XXX How can I do a spinner here?
        process.stdout.write('.');
        if (err) {
          return resolve(undefined);
        }
        if (data.DomainStatus.Endpoints) {
          ready = true;
          return resolve(`${prefix}${data.DomainStatus.Endpoints.vpc}`);
        }
        resolve(undefined);
      });
    });

    if (result) {
      return result;
    }
  }

  throw OpsDataException.failedElasticSearchCreate(
    `Timed out waiting for a valid endpoint from ${esCfg.DomainName} - replace the filename with a properly specified endpoint when it's available.`
  );
};

const createElasticSearch = async (awsConfig: IAwsConfig, deployment: IOpsDeployment, esCfg: any): Promise<string> => {
  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  const options = {
    signatureVersion: 'v4',
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };

  let iam = new AWS.IAM(options);
  let cloudwatchlogs = new AWS.CloudWatchLogs(options);
  let es = new AWS.ES(options);

  debug('ES: deploying');
  // Make sure the service role exists first: CreateServiceLinkedRole
  await new Promise((resolve, reject) => {
    let params = { AWSServiceName: 'es.amazonaws.com', Description: '' };
    iam.createServiceLinkedRole(params, (err: any, data: any) => {
      debug('iam.createServiceLinkedRole', err, JSON.stringify(data));
      if (err && err.code != 'InvalidInput') {
        return reject(OpsDataException.failedElasticSearchCreate(err));
      }
      resolve(data);
    });
  });

  // Create the log group for the service
  await new Promise((resolve, reject) => {
    let params = {
      logGroupName: createLogGroupName(deployment),
    };
    cloudwatchlogs.createLogGroup(params, (err: any, data: any) => {
      debug('cloudwatchlogs.createLogGroup', err, JSON.stringify(data));
      if (err && err.code != 'ResourceAlreadyExistsException') {
        return reject(OpsDataException.failedElasticSearchCreate(err));
      }
      resolve(data);
    });
  });

  // Create the log groups resource policy to allow ES to access it
  await new Promise((resolve, reject) => {
    let params = {
      policyDocument: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'es.amazonaws.com' },
            Action: ['logs:PutLogEvents', 'logs:CreateLogStream'],
            Resource: esCfg.LogPublishingOptions.ES_APPLICATION_LOGS.CloudWatchLogsLogGroupArn + ':*',
          },
        ],
      }),
      policyName: `AES-${esCfg.DomainName}-Application-logs`,
    };
    cloudwatchlogs.putResourcePolicy(params, (err: any, data: any) => {
      debug('cloudwatchlogs.putResourcePolicy', err, JSON.stringify(data));
      if (err && err.code != 'ResourceAlreadyExistsException') {
        return reject(OpsDataException.failedElasticSearchCreate(err));
      } else resolve(data);
    });
  });

  // Create the ES domain
  return await new Promise((resolve, reject) =>
    es.createElasticsearchDomain(esCfg, async (err: any, data: any) => {
      debug('es.createElasticsearchDomain', err, JSON.stringify(data));
      if (err != null) {
        debug('Received err:', err.code);
        if (err.code != 'ResourceAlreadyExistsException') {
          return reject(OpsDataException.failedElasticSearchCreate(err));
        }
      }
      debug('Successful ES cluster create');
      debug(JSON.stringify(data));

      debug('Waiting for cluster endpoint');
      resolve(await waitForElasticSearchReady(es, esCfg));
    })
  );
};

export { parseElasticSearchUrl, loadElasticSearchConfigFile, getDefaultElasticSearchConfig, createElasticSearch };
