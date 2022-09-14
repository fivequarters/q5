import * as AWS from 'aws-sdk';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { IOpsDeployment } from '@5qtrs/ops-data';
import * as Constants from '@5qtrs/constants';
import { debug } from './OpsDebug';
import { LambdaCronZip } from '@5qtrs/ops-lambda-set';
import { waitForFunction } from './Utilities';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataTables } from './OpsDataTables';

const Async = require('async');

export async function createCron(
  config: OpsDataAwsConfig,
  awsConfig: IAwsConfig,
  provider: OpsDataAwsProvider,
  tables: OpsDataTables,
  deployment: IOpsDeployment
) {
  const Config = createCronConfig(config, awsConfig);
  const DeploymentPackage = LambdaCronZip();
  const networkData = await OpsNetworkData.create(config, provider, tables);
  const network = await networkData.get(deployment.networkName, deployment.region);

  debug('IN CRON SETUP');

  let ctx: any = {};

  AWS.config.apiVersions = {
    sqs: '2012-11-05',
    lambda: '2015-03-31',
    cloudwatchevents: '2015-10-07',
  };

  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  const options = {
    signatureVersion: 'v4',
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };

  let sqs = new AWS.SQS(options);
  let lambda = new AWS.Lambda(options);
  let cloudwatchevents = new AWS.CloudWatchEvents(options);

  return new Promise((resolve, reject) => {
    return Async.series(
      [
        (cb: any) => setupDeadLetterQueue(cb),
        (cb: any) => getDeadLetterQueueArn(cb),
        (cb: any) => setupQueue(cb),
        (cb: any) => getQueueArn(cb),
        (cb: any) => createExecutor(cb),
        (cb: any) => connectQueueToExecutor(cb),
        (cb: any) => createScheduledTrigger(cb),
        (cb: any) => createScheduler(cb),
        (cb: any) => allowTriggerToExecuteScheduler(cb),
        (cb: any) => addSchedulerAsTriggerTarget(cb),
        // TODO, tjanczuk, create CloudTrail to track execution of this funnel and preserve historical record
      ],
      (e: any) => {
        if (e) return reject(e);
        debug('CRON DEPLOYED SUCCESSFULLY');
        resolve();
      }
    );
  });

  function addSchedulerAsTriggerTarget(cb: any) {
    debug('Adding scheduler Lambda as target of scheduled Cloud Watch Event...');
    return cloudwatchevents.putTargets(
      {
        Rule: Config.trigger.name,
        Targets: [{ Arn: ctx.schedulerArn, Id: Config.trigger.name }],
      },
      (e, d) => {
        if (e) return cb(e);
        if (d.FailedEntryCount && d.FailedEntryCount > 0)
          return cb(
            new Error(
              'Error adding scheduler Lambda as target of scheduled Cloud Watch Event: ' + JSON.stringify(d, null, 2)
            )
          );
        debug('Added.');
        cb();
      }
    );
  }

  function allowTriggerToExecuteScheduler(cb: any) {
    debug('Adding permissions for Cloud Watch Event to call scheduler Lambda...');
    return lambda.addPermission(
      {
        FunctionName: Config.scheduler.name,
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
        SourceArn: ctx.ruleArn,
        StatementId: Config.scheduler.name,
      },
      (e) => {
        if (e) {
          if (e.code === 'ResourceConflictException') {
            debug('Permissions already exist.');
            return cb();
          }
          return cb(e);
        }
        debug('Added permissions.');
        cb();
      }
    );
  }

  function createScheduledTrigger(cb: any) {
    debug('Creating scheduled Cloud Watch Event...');
    return cloudwatchevents.putRule(
      {
        Name: Config.trigger.name,
        Description: 'Trigger for CRON scheduler',
        ScheduleExpression: Config.trigger.schedule,
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.ruleArn = d.RuleArn;
        debug('Created scheduled Cloud Watch Event:', ctx.ruleArn);
        cb();
      }
    );
  }

  function connectQueueToExecutor(cb: any) {
    debug('Connecting executor to SQS...');
    return lambda.createEventSourceMapping(
      {
        EventSourceArn: ctx.queueArn,
        FunctionName: Config.executor.name,
        Enabled: true,
        BatchSize: Config.executor.batchSize,
      },
      (e, d) => {
        if (e) {
          if (e.code === 'ResourceConflictException') {
            debug('Executor already connected to SQS.');
            return cb();
          }
          return cb(e);
        }
        debug('Executor connected to SQS:', d.UUID);
        cb();
      }
    );
  }

  function createExecutor(cb: any) {
    debug('Creating cron executor Lambda function...');
    const optionalEnvVars: any = {};
    if (deployment.grafana) {
      optionalEnvVars.GRAFANA_ENDPOINT = `${Constants.GRAFANA_LEADER_PREFIX}${
        deployment.grafana
      }.${config.getDiscoveryDomainName()}`;
    }
    let params = {
      FunctionName: Config.executor.name,
      Description: 'CRON executor',
      Handler: 'index.executor',
      Role: Config.executor.role,
      MemorySize: Config.executor.memory,
      Timeout: Config.executor.timeout,
      Runtime: Config.executor.runtime,
      Code: {
        ZipFile: DeploymentPackage,
      },
      VpcConfig: {
        SecurityGroupIds: [network.securityGroupId],
        SubnetIds: network.privateSubnets.map((sn) => sn.id),
      },
      Environment: {
        Variables: {
          AWS_S3_BUCKET: config.getS3Bucket(deployment),
          CRON_CONCURRENT_EXECUTION_LIMIT: Config.executor.concurrentExecutionLimit.toString(),
          DEPLOYMENT_KEY: awsConfig.prefix || 'global',
          API_SERVER: `https://${deployment.deploymentName}.${deployment.region}.${deployment.domainName}`,
          ...optionalEnvVars,
        },
      },
    };
    return lambda.createFunction(params, (e, d) => {
      if (e) {
        if (e.code === 'ResourceConflictException') {
          debug('Function already exists, updating...');
          let updateCodeParams = {
            FunctionName: params.FunctionName,
            ZipFile: params.Code.ZipFile,
          };
          let updateConfigurationParams = {
            ...params,
          };
          delete updateConfigurationParams.Code;
          return Async.series(
            [
              (cb: any) => lambda.updateFunctionCode(updateCodeParams, cb),
              (cb: any) => waitForFunction(lambda, params.FunctionName).then(cb),
              (cb: any) => lambda.updateFunctionConfiguration(updateConfigurationParams, cb),
            ],
            (e: any, results: any[]) => {
              if (e) return cb(e);
              ctx.executorArn = results[0].FunctionArn;
              ctx.executorExisted = true;
              debug('Executor updated:', ctx.executorArn);
              return cb();
            }
          );
        }
        return cb(e);
      }
      ctx.executorArn = d.FunctionArn;
      debug('Executor created:', ctx.executorArn);
      return cb();
    });
  }

  function createScheduler(cb: any) {
    debug('Creating cron scheduler Lambda function...');
    let params = {
      FunctionName: Config.scheduler.name,
      Description: 'CRON scheduler',
      Handler: 'index.scheduler',
      Role: Config.scheduler.role,
      MemorySize: Config.scheduler.memory,
      Timeout: Config.scheduler.timeout,
      Runtime: Config.scheduler.runtime,
      Code: {
        ZipFile: DeploymentPackage,
      },
      Environment: {
        Variables: {
          CRON_FILTER: Config.scheduler.filter,
          CRON_MAX_EXECUTIONS_PER_WINDOW: Config.scheduler.maxExecutionsPerWindow.toString(),
          AWS_S3_BUCKET: config.getS3Bucket(deployment),
          CRON_QUEUE_URL: ctx.queueUrl,
          DEPLOYMENT_KEY: awsConfig.prefix || 'global',
          LOGS_DISABLE: 'true',
          API_SERVER: `https://${deployment.deploymentName}.${deployment.region}.${deployment.domainName}`,
        },
      },
    };

    return lambda.createFunction(params, (e, d) => {
      if (e) {
        if (e.code === 'ResourceConflictException') {
          debug('Function already exists, updating...');
          let updateCodeParams = {
            FunctionName: params.FunctionName,
            ZipFile: params.Code.ZipFile,
          };
          let updateConfigurationParams = {
            ...params,
          };
          delete updateConfigurationParams.Code;
          return Async.series(
            [
              (cb: any) => lambda.updateFunctionCode(updateCodeParams, cb),
              (cb: any) => waitForFunction(lambda, params.FunctionName).then(cb),
              (cb: any) => lambda.updateFunctionConfiguration(updateConfigurationParams, cb),
            ],
            (e: any, results: any[]) => {
              if (e) return cb(e);
              ctx.schedulerArn = results[0].FunctionArn;
              ctx.schedulerExisted = true;
              debug('Scheduler updated:', ctx.schedulerArn);
              return cb();
            }
          );
        }
        return cb(e);
      }
      ctx.schedulerArn = d.FunctionArn;
      debug('Scheduler created:', ctx.schedulerArn);
      cb();
    });
  }

  function setupDeadLetterQueue(cb: any) {
    debug('Creating SQS dead letter queue...');
    return sqs.createQueue(
      {
        QueueName: Config.queue.deadLetterName,
        Attributes: {},
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.deadLetterQueueUrl = d.QueueUrl;
        debug('Dead letter queue created:', d.QueueUrl);
        cb();
      }
    );
  }

  function getDeadLetterQueueArn(cb: any) {
    debug('Getting dead letter queue ARN...');
    sqs.getQueueAttributes(
      {
        QueueUrl: ctx.deadLetterQueueUrl,
        AttributeNames: ['QueueArn'],
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.deadLetterQueueArn = d.Attributes && d.Attributes.QueueArn;
        debug('Dead letter queue ARN:', ctx.deadLetterQueueArn);
        cb();
      }
    );
  }

  function getQueueArn(cb: any) {
    debug('Getting queue ARN...');
    sqs.getQueueAttributes(
      {
        QueueUrl: ctx.queueUrl,
        AttributeNames: ['QueueArn'],
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.queueArn = d.Attributes && d.Attributes.QueueArn;
        debug('Queue ARN:', ctx.queueArn);
        cb();
      }
    );
  }

  function setupQueue(cb: any) {
    debug('Creating SQS queue...');
    sqs.createQueue(
      {
        QueueName: Config.queue.name,
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.queueUrl = d.QueueUrl;
        sqs.setQueueAttributes(
          {
            Attributes: {
              VisibilityTimeout: (6 * Config.executor.timeout).toString(),
              RedrivePolicy: JSON.stringify({
                maxReceiveCount: Config.queue.maxReceiveCount.toString(),
                deadLetterTargetArn: ctx.deadLetterQueueArn,
              }),
            },
            QueueUrl: ctx.queueUrl,
          },
          (e, d) => {
            debug('Queue created and configured:', ctx.queueUrl);
            cb();
          }
        );
      }
    );
  }
}

function createCronConfig(config: OpsDataAwsConfig, awsConfig: IAwsConfig) {
  // CRON_PREFIX is a deployment time setting that can be used to create isolated deployments of the CRON pipeline,
  // e.g. for testing purposes, especially along with CRON_FILTER
  const CronPrefix = `${awsConfig.prefix || 'global'}-`;

  return {
    prefix: CronPrefix,

    // SQS queue configuration
    queue: {
      name: `${CronPrefix}cron`,
      deadLetterName: `${CronPrefix}cron-dead-letter`,
      maxReceiveCount: 5,
    },

    // Lambda function that is triggered by SQS messages and executes user Lambda functions
    executor: {
      name: `${CronPrefix}cron-executor`,
      timeout: Constants.MaxLambdaExecutionTimeSeconds,
      memory: 1024,
      runtime: 'nodejs14.x',
      role: `${config.arnPrefix}:iam::${awsConfig.account}:role/${config.cronExecutorRoleName}`,
      batchSize: 10,
      concurrentExecutionLimit: '10',
    },

    // Lambda function that is triggered by scheduled Cloud Watch Events and populates SQS
    scheduler: {
      name: `${CronPrefix}cron-scheduler`,
      timeout: 120,
      memory: 1024,
      runtime: 'nodejs14.x',
      roleName: `${CronPrefix}cron-scheduler`,
      role: `${config.arnPrefix}:iam::${awsConfig.account}:role/${config.cronSchedulerRoleName}`,
      filter: config.cronFilter,
      maxExecutionsPerWindow: config.cronMaxExecutionsPerWindow,
    },

    // Scheduled Cloud Watch Events that trigger the scheduler Lambda
    trigger: {
      name: `${CronPrefix}cron-scheduler-trigger`,
      schedule: 'cron(8/10 * * * ? *)', // every 10th minute from 8 through 59 (https://crontab.guru/#8/10_*_*_*_*)
      // re: ? in the cron expression, see quirks https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
    },
  };
}

export async function deleteCron(config: OpsDataAwsConfig, awsConfig: IAwsConfig): Promise<void> {
  const Config = createCronConfig(config, awsConfig);
  AWS.config.apiVersions = {
    sqs: '2012-11-05',
    lambda: '2015-03-31',
    cloudwatchevents: '2015-10-07',
  };

  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  const options = {
    signatureVersion: 'v4',
    region: awsConfig.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
  };

  let sqs = new AWS.SQS(options);
  let lambda = new AWS.Lambda(options);
  let cloudwatchevents = new AWS.CloudWatchEvents(options);

  return new Promise((resolve, reject) => {
    return Async.series(
      [
        (cb: any) => deleteQueue(Config.queue.deadLetterName, cb),
        (cb: any) => deleteQueue(Config.queue.name, cb),
        (cb: any) => deleteEventSourceMappings(Config.executor.name, cb),
        (cb: any) => deleteLambda(Config.executor.name, cb),
        (cb: any) => deleteScheduledTriggerTargets(cb),
        (cb: any) => deleteScheduledTrigger(cb),
        (cb: any) => deleteLambda(Config.scheduler.name, cb),
      ],
      (e: any) => {
        if (e) {
          return reject(e);
        }
        //debug('CRON DESTROYED SUCCESSFULLY');
        resolve();
      }
    );
  });

  function deleteScheduledTriggerTargets(cb: any) {
    //debug(`Deleting rule targets for Cloud Watch Event '${Config.trigger.name}'...`);
    return cloudwatchevents.listTargetsByRule({ Rule: Config.trigger.name }, (e: any, d: any) => {
      if (e) {
        //debug('Error deleting rule targets:', e.message);
        cb();
      } else {
        let ids = d.Targets.map((t: any) => t.Id);
        if (ids.length > 0) {
          return cloudwatchevents.removeTargets({ Ids: ids, Rule: Config.trigger.name }, (e, d) => {
            // if (e) debug('Error deleting rule targets', e.message);
            // else debug('Deleted rule targets');
            cb();
          });
        } else {
          debug('No targets to delete');
          cb();
        }
      }
    });
  }

  function deleteScheduledTrigger(cb: any) {
    debug(`Deleting Cloud Watch Event '${Config.trigger.name}'...`);
    return cloudwatchevents.deleteRule(
      {
        Name: Config.trigger.name,
      },
      (e) => {
        // if (e) debug('Error deleting scheduled Cloud Watch Event:', e.message);
        // else debug('Deleted scheduled Cloud Watch Event.');
        cb();
      }
    );
  }

  function deleteEventSourceMappings(name: string, cb: any) {
    //debug(`Deleting event source mappings for Lambda function '${name}'...`);
    return lambda.listEventSourceMappings({ FunctionName: name }, (e: any, d: any) => {
      if (e) {
        //debug('Error deleting event source mappings for Lambda:', e.message);
        cb();
      } else {
        if (d.EventSourceMappings.length > 0) {
          return Async.each(
            d.EventSourceMappings,
            (mapping: any, cb: any) =>
              lambda.deleteEventSourceMapping({ UUID: mapping.UUID }, (e) => {
                // if (e) debug('Error deleting UUID mapping:', mapping.UUID, e.message);
                // else debug('Deleted event mapping:', mapping.UUID);
                cb();
              }),
            cb
          );
        } else {
          //debug('No event mappings to delete.');
          cb();
        }
      }
    });
  }

  function deleteLambda(name: string, cb: any) {
    //debug(`Deleting Lambda function '${name}'...`);
    return lambda.deleteFunction(
      {
        FunctionName: name,
      },
      (e, d) => {
        // if (e) debug('Error deleting Lambda:', e.message);
        // else debug('Function deleted');
        cb();
      }
    );
  }

  function deleteQueue(queueName: string, cb: any) {
    //debug(`Deleting SQS queue '${queueName}'...`);
    return sqs.getQueueUrl({ QueueName: queueName }, (e: any, d: any) => {
      if (e) {
        //debug('Error deleting queue:', e.message);
        return cb();
      } else {
        return sqs.deleteQueue(
          {
            QueueUrl: d.QueueUrl,
          },
          (e, d) => {
            // if (e) debug('Error deleting queue:', e.message);
            // else debug('Queue deleted');
            cb();
          }
        );
      }
    });
  }
}
