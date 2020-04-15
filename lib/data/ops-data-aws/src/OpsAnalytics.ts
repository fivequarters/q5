import * as AWS from 'aws-sdk';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { IOpsDeployment } from '@5qtrs/ops-data';
import { debug } from './OpsDebug';
const Async = require('async');
const Fs = require('fs');
const Path = require('path');

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

function createAnalyticsConfig(awsDataConfig: OpsDataAwsConfig, awsConfig: IAwsConfig, zipFile: Buffer) {
  const prefix = `${awsConfig.prefix || 'global'}-`;

  const cfg = {
    lambda: {
      FunctionName: `${prefix}lambda-analytics`,
      Description: 'Analytics Pipeline Forwarder',
      Handler: 'index.executor',
      Role: `${awsDataConfig.arnPrefix}:iam::${awsConfig.account}:role/${awsDataConfig.cronExecutorRoleName}`,
      Timeout: 60,
      MemorySize: 128,
      Runtime: 'nodejs10.x',
      Code: { ZipFile: zipFile },
      Environment: {
        ES_HOST: 'XXXESHOST',
        ES_USER: 'XXXESUSER',
        ES_PASSWORD: 'XXXESPASSWORD',
      },
    },
    cloudWatchLogs: { logGroupName: `${prefix}analytics-logs` },
    subscriptionFilter: { destinationArn: '', filterName: '', filterPattern: '', logGroupName: '' },
  };

  cfg.subscriptionFilter = {
    destinationArn: `${awsDataConfig.arnPrefix}:iam::${awsConfig.account}:lambda/${cfg.lambda.FunctionName}`,
    filterName: `${cfg.cloudWatchLogs.logGroupName}_${cfg.lambda.FunctionName}`,
    filterPattern: '',
    logGroupName: cfg.cloudWatchLogs.logGroupName,
  };

  return cfg;
}

function createCloudWatchLogGroup(cwl: any, config: any, cb: AsyncCb) {
  debug('Creating cloudwatch log group...');
  cwl.createLogGroup({ logGroupName: config.logGroupName }, (e: any, d: any) => {
    if (e != null && e.code != 'ResourceAlreadyExistsException') {
      cb(e);
    }
    cb();
  });
}

function createOrUpdateLambda(lambda: any, config: any, cb: AsyncCb) {
  debug('Creating lambda-analytics function...');

  return lambda.createFunction(config, (e: any, d: any) => {
    if (e) {
      if (e.code === 'ResourceConflictException') {
        debug('Function already exists, updating...');
        let updateCodeParams = {
          FunctionName: config.FunctionName,
          ZipFile: config.Code.ZipFile,
        };
        delete config.Code;
        return Async.series(
          [
            (cb: AsyncCb) => lambda.updateFunctionCode(updateCodeParams, cb),
            (cb: AsyncCb) => lambda.updateFunctionConfiguration(config, cb),
          ],
          (e: any, results: any[]) => {
            return cb(e);
          }
        );
      }
    }
    return cb(e);
  });
}

function createCloudWatchSubscription(cwl: any, config: any, cb: AsyncCb) {
  cwl.putSubscriptionFilter(config, (e: any, d: any) => {
    if (e && e.code != 'ResourceConflictException') {
      return cb(e);
    }
    return cb();
  });
}

export async function createAnalyticsPipeline(
  awsDataConfig: OpsDataAwsConfig,
  awsConfig: IAwsConfig,
  deployment: IOpsDeployment
) {
  console.log('XXX createAnalyticsPipeline', __dirname);

  const deploymentPackage = Fs.readFileSync(Path.join(__dirname, 'lambda-analytics.zip'));
  const config = createAnalyticsConfig(awsDataConfig, awsConfig, deploymentPackage);

  debug('IN ANALYTICS SETUP');

  const { lambda, cloudwatchlogs } = await getAWS(awsConfig);

  return new Promise((resolve, reject) => {
    return Async.series(
      [
        // prettier-ignore
        (cb: AsyncCb) => createCloudWatchLogGroup(cloudwatchlogs, config.cloudWatchLogs, cb),
        (cb: AsyncCb) => createOrUpdateLambda(lambda, config.lambda, cb),
        (cb: AsyncCb) => createCloudWatchSubscription(cloudwatchlogs, config.subscriptionFilter, cb),
      ],
      (e: any): void => {
        if (e) return reject(e);
        debug('lambda-analytics DEPLOYED SUCCESSFULLY');
        resolve();
      }
    );
  });
}
