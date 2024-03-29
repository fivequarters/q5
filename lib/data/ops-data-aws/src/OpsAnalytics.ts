import * as AWS from 'aws-sdk';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { IOpsDeployment } from '@5qtrs/ops-data';
import { debug } from './OpsDebug';
import { LambdaAnalyticsZip } from '@5qtrs/ops-lambda-set';
import { OpsDataTables } from './OpsDataTables';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { parseElasticSearchUrl } from './OpsElasticSearch';

import { waitForFunction } from './Utilities';

const Async = require('async');

type AsyncCb = (e?: Error | null) => void;

async function getAWS(awsConfig: IAwsConfig) {
  AWS.config.apiVersions = {
    lambda: '2015-03-31',
    cloudwatchevents: '2015-10-07',
    cloudwatchlogs: '2014-03-28',
  };

  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  const options = {
    signatureVersion: 'v4',
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };

  let lambda = new AWS.Lambda(options);
  let cloudwatchlogs = new AWS.CloudWatchLogs(options);

  return { lambda, cloudwatchlogs, awsOptions: options, awsCredentials: credentials };
}

async function createAnalyticsConfig(
  awsDataConfig: OpsDataAwsConfig,
  awsConfig: IAwsConfig,
  provider: OpsDataAwsProvider,
  tables: OpsDataTables,
  deployment: IOpsDeployment,
  zipFile: Buffer
) {
  const prefix = `${awsConfig.prefix || 'global'}-`;

  const networkData = await OpsNetworkData.create(awsDataConfig, provider, tables);
  const network = await networkData.get(deployment.networkName, deployment.region);

  // Parse the Elastic Search credentials
  let esCreds = parseElasticSearchUrl(deployment.elasticSearch);
  let esVar = { ES_HOST: esCreds.hostname, ES_USER: esCreds.username, ES_PASSWORD: esCreds.password };

  const cfg = {
    lambda: {
      FunctionName: `${prefix}lambda-analytics`,
      Description: 'Analytics Pipeline Forwarder',
      Handler: 'index.handler',
      Role: `${awsDataConfig.arnPrefix}:iam::${awsConfig.account}:role/${awsDataConfig.analyticsRoleName}`,
      Timeout: 60,
      MemorySize: 128,
      Runtime: 'nodejs14.x',
      Code: { ZipFile: zipFile },
      Environment: {
        Variables: {
          DEPLOYMENT_KEY: awsConfig.prefix,
          SEGMENT_KEY: deployment.segmentKey,
          ...esVar,
        },
      },
      VpcConfig: {
        SecurityGroupIds: [network.securityGroupId],
        SubnetIds: network.privateSubnets.map((sn) => sn.id),
      },
    },
    cloudWatchLogs: { logGroupName: `${prefix}analytics-logs` },
    cloudWatchLogsRetention: { logGroupName: '', retentionInDays: 7 },
    subscriptionFilter: { destinationArn: '', filterName: '', filterPattern: '', logGroupName: '' },
    deleteSubscriptionFilter: { filterName: '', logGroupName: '' },
    grantLambda: {
      FunctionName: '',
      StatementId: 'lambda-analytics-invoke',
      Action: 'lambda:InvokeFunction',
      Principal: '',
      SourceArn: '',
      SourceAccount: `${awsConfig.account}`,
    },
  };

  cfg.cloudWatchLogsRetention.logGroupName = cfg.cloudWatchLogs.logGroupName;

  cfg.subscriptionFilter = {
    destinationArn: `${awsDataConfig.arnPrefix}:lambda:${awsConfig.region}:${awsConfig.account}:function:${cfg.lambda.FunctionName}`,
    filterName: `${cfg.cloudWatchLogs.logGroupName}_${cfg.lambda.FunctionName}`,
    filterPattern: '',
    logGroupName: cfg.cloudWatchLogs.logGroupName,
  };

  cfg.deleteSubscriptionFilter = {
    filterName: `${cfg.cloudWatchLogs.logGroupName}_${cfg.lambda.FunctionName}`,
    logGroupName: cfg.cloudWatchLogs.logGroupName,
  };

  cfg.grantLambda = {
    ...cfg.grantLambda,
    FunctionName: cfg.subscriptionFilter.destinationArn,
    Principal: 'logs.amazonaws.com',
    SourceArn: `${awsDataConfig.arnPrefix}:logs:${awsConfig.region}:${awsConfig.account}:log-group:${cfg.cloudWatchLogs.logGroupName}:*`,
  };

  return cfg;
}

function createCloudWatchLogGroup(cwl: any, config: any, cb: AsyncCb) {
  debug('Creating cloudwatch log group...');
  cwl.createLogGroup(config, (e: any, d: any) => {
    if (e != null && e.code != 'ResourceAlreadyExistsException') {
      return cb(e);
    }
    return cb();
  });
}

function setCloudWatchLogGroupRetention(cwl: any, config: any, cb: AsyncCb) {
  debug(`Setting cloudwatch log group retention policy to ${config.retentionInDays} days...`);
  cwl.putRetentionPolicy(config, (e: any, d: any) => {
    if (e != null) {
      return cb(e);
    }
    return cb();
  });
}

function grantCloudWatchLogGroupLambdaInvocation(lambda: any, config: any, cb: AsyncCb) {
  debug('grantCloudWatchLogGroupLambdaInvocation', config);
  return lambda.addPermission(config, (e: any, d: any) => {
    if (e && e.code != 'ResourceConflictException') {
      return cb(e);
    }
    return cb();
  });
}

function createOrUpdateLambda(lambda: any, config: any, cb: AsyncCb) {
  debug('createOrUpdateLambda', config);

  return lambda.createFunction(config, (e: any, d: any) => {
    if (e) {
      if (e.code === 'ResourceConflictException') {
        debug(`Function exists, updating...`);
        let updateCodeParams = {
          FunctionName: config.FunctionName,
          ZipFile: config.Code.ZipFile,
        };
        delete config.Code;
        return Async.series(
          [
            (cb: AsyncCb) => lambda.updateFunctionCode(updateCodeParams, cb),
            (cb: AsyncCb) => waitForFunction(lambda, config.FunctionName).then(cb),
            (cb: AsyncCb) => lambda.updateFunctionConfiguration(config, cb),
          ],
          (e: any, results: any[]) => {
            if (e) return cb(e);
            debug(`'${results[0].FunctionArn}' updated`);
            return cb(e);
          }
        );
      }
    }
    debug('Finished with lambda create, error: ', e);
    return cb(e);
  });
}

function createCloudWatchSubscription(cwl: any, config: any, cb: AsyncCb) {
  debug('createCloudWatchSubscription', config);
  cwl.putSubscriptionFilter(config, (e: any, d: any) => {
    if (e && e.code != 'ResourceConflictException' && e.code != 'LimitExceededException') {
      return cb(e);
    }
    debug('leaving createCloudWatchSubscription');
    return cb();
  });
}

function deleteCloudWatchSubscription(cwl: any, config: any, cb: AsyncCb) {
  debug('deleteCloudWatchSubscription', config);
  cwl.deleteSubscriptionFilter(config, (e: any, d: any) => {
    if (e && e.code != 'ResourceNotFoundException') {
      debug('Unable to delete object:', e);
      return cb(e);
    }
    return cb();
  });
}

export async function createAnalyticsPipeline(
  awsDataConfig: OpsDataAwsConfig,
  awsConfig: IAwsConfig,
  provider: OpsDataAwsProvider,
  tables: OpsDataTables,
  deployment: IOpsDeployment
) {
  const deploymentPackage = LambdaAnalyticsZip();

  const config = await createAnalyticsConfig(awsDataConfig, awsConfig, provider, tables, deployment, deploymentPackage);

  debug('IN ANALYTICS SETUP');

  const { lambda, cloudwatchlogs } = await getAWS(awsConfig);

  return new Promise((resolve, reject) => {
    const subscribeLambdaAnalyticsToCloudWatch =
      deployment.elasticSearch?.length > 0 || deployment.segmentKey?.length > 0;
    return Async.series(
      [
        // prettier-ignore
        (cb: AsyncCb) => createCloudWatchLogGroup(cloudwatchlogs, config.cloudWatchLogs, cb),
        (cb: AsyncCb) => setCloudWatchLogGroupRetention(cloudwatchlogs, config.cloudWatchLogsRetention, cb),
        (cb: AsyncCb) => createOrUpdateLambda(lambda, config.lambda, cb),
        (cb: AsyncCb) => grantCloudWatchLogGroupLambdaInvocation(lambda, config.grantLambda, cb),

        subscribeLambdaAnalyticsToCloudWatch
          ? (cb: AsyncCb) => createCloudWatchSubscription(cloudwatchlogs, config.subscriptionFilter, cb)
          : (cb: AsyncCb) => deleteCloudWatchSubscription(cloudwatchlogs, config.deleteSubscriptionFilter, cb),
      ],
      (e: any): void => {
        if (e) {
          return reject(e);
        }
        debug('lambda-analytics DEPLOYED SUCCESSFULLY');
        resolve();
      }
    );
  });
}
