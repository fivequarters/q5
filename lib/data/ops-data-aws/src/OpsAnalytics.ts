import * as AWS from 'aws-sdk';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { IOpsDeployment } from '@5qtrs/ops-data';
import { debug } from './OpsDebug';
const Async = require('async');
const Fs = require('fs');
const Path = require('path');

import url from 'url';

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

function createAnalyticsConfig(
  awsDataConfig: OpsDataAwsConfig,
  awsConfig: IAwsConfig,
  deployment: IOpsDeployment,
  zipFile: Buffer
) {
  const prefix = `${awsConfig.prefix || 'global'}-`;

  // Parse the Elastic Search credentials
  let esCreds = { ES_HOST: '', ES_USER: '', ES_PASSWORD: '' };

  let esUrl = url.parse(deployment.elasticSearch);
  if (esUrl.host && esUrl.auth) {
    let auth = esUrl.auth.match(/([^:]+):(.*)/);
    if (auth && auth[1] && auth[2]) {
      esCreds = {
        ES_HOST: esUrl.host,
        ES_USER: auth[1],
        ES_PASSWORD: auth[2],
      };
    }
  }

  const cfg = {
    lambda: {
      FunctionName: `${prefix}lambda-analytics`,
      Description: 'Analytics Pipeline Forwarder',
      Handler: 'index.executor',
      Role: `${awsDataConfig.arnPrefix}:iam::${awsConfig.account}:role/${awsDataConfig.analyticsRoleName}`,
      Timeout: 60,
      MemorySize: 128,
      Runtime: 'nodejs10.x',
      Code: { ZipFile: zipFile },
      Environment: {
        Variables: {
          ...esCreds,
        },
      },
    },
    cloudWatchLogs: { logGroupName: `${prefix}analytics-logs` },
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
    SourceArn: `arn:aws:logs:${awsConfig.region}:${awsConfig.account}:log-group:${cfg.cloudWatchLogs.logGroupName}:*`,
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
    debug('Finished with lambda create', e);
    return cb(e);
  });
}

function createCloudWatchSubscription(cwl: any, config: any, cb: AsyncCb) {
  debug('createCloudWatchSubscription', config);
  cwl.putSubscriptionFilter(config, (e: any, d: any) => {
    if (e && e.code != 'ResourceConflictException') {
      return cb(e);
    }
    debug('leaving createCloudWatchSubscription');
    return cb();
  });
}

function deleteCloudWatchSubscription(cwl: any, config: any, cb: AsyncCb) {
  debug('deleteCloudWatchSubscription', config);
  cwl.deleteSubscriptionFilter(config, (e: any, d: any) => {
    if (e) debug('error ignored:', e);
    cb();
  });
}

export async function createAnalyticsPipeline(
  awsDataConfig: OpsDataAwsConfig,
  awsConfig: IAwsConfig,
  deployment: IOpsDeployment
) {
  console.log('createAnalyticsPipeline', __dirname, deployment);
  console.log('awsConfig', awsConfig);
  console.log('awsDataConfig', awsDataConfig);

  const deploymentPackage = Fs.readFileSync(Path.join(__dirname, 'lambda-analytics.zip'));
  const config = createAnalyticsConfig(awsDataConfig, awsConfig, deployment, deploymentPackage);

  debug('IN ANALYTICS SETUP');

  const { lambda, cloudwatchlogs } = await getAWS(awsConfig);

  return new Promise((resolve, reject) => {
    return Async.series(
      [
        // prettier-ignore
        (cb: AsyncCb) => createCloudWatchLogGroup(cloudwatchlogs, config.cloudWatchLogs, cb),
        (cb: AsyncCb) => createOrUpdateLambda(lambda, config.lambda, cb),
        (cb: AsyncCb) => grantCloudWatchLogGroupLambdaInvocation(lambda, config.grantLambda, cb),

        deployment.elasticSearch.length > 0
          ? (cb: AsyncCb) => createCloudWatchSubscription(cloudwatchlogs, config.subscriptionFilter, cb)
          : (cb: AsyncCb) => deleteCloudWatchSubscription(cloudwatchlogs, config.deleteSubscriptionFilter, cb),
      ],
      (e: any): void => {
        if (e) return reject(e);
        debug('lambda-analytics DEPLOYED SUCCESSFULLY');
        resolve();
      }
    );
  });
}
