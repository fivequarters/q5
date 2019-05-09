import * as AWS from 'aws-sdk';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
const Async = require('async');
const Fs = require('fs');
const Path = require('path');

export async function createCron(config: OpsDataAwsConfig, awsConfig: IAwsConfig) {
  const Config = createCronConfig(config, awsConfig);
  const DeploymentPackage = Fs.readFileSync(Path.join(__dirname, '../lambda/cron/dist/cron.zip'));

  let ctx: any = {};

  AWS.config.apiVersions = {
    sqs: '2012-11-05',
    lambda: '2015-03-31',
    cloudwatchevents: '2015-10-07',
  };

  const credentials = await (awsConfig.creds as AwsCreds).getCredentials();
  AWS.config.accessKeyId = credentials.accessKeyId;
  AWS.config.secretAccessKey = credentials.secretAccessKey;
  AWS.config.sessionToken = credentials.sessionToken;
  AWS.config.region = awsConfig.region;
  AWS.config.signatureVersion = 'v4';

  let sqs = new AWS.SQS();
  let lambda = new AWS.Lambda();
  let cloudwatchevents = new AWS.CloudWatchEvents();

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
        // console.log('CRON DEPLOYED SUCCESSFULLY');
        resolve();
      }
    );
  });

  function addSchedulerAsTriggerTarget(cb: any) {
    // console.log('Adding scheduler Lambda as target of scheduled Cloud Watch Event...');
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
        // console.log('Added.');
        cb();
      }
    );
  }

  function allowTriggerToExecuteScheduler(cb: any) {
    // console.log('Adding permissions for Cloud Watch Event to call scheduler Lambda...');
    return lambda.addPermission(
      {
        FunctionName: Config.scheduler.name,
        Action: 'lambda:InvokeFunction',
        Principal: 'events.amazonaws.com',
        SourceArn: ctx.ruleArn,
        StatementId: Config.scheduler.name,
      },
      e => {
        if (e) {
          if (e.code === 'ResourceConflictException') {
            // console.log('Permissions already exist.');
            return cb();
          }
          return cb(e);
        }
        // console.log('Added permissions.');
        cb();
      }
    );
  }

  function createScheduledTrigger(cb: any) {
    // console.log('Creating scheduled Cloud Watch Event...');
    return cloudwatchevents.putRule(
      {
        Name: Config.trigger.name,
        Description: 'Trigger for CRON scheduler',
        ScheduleExpression: Config.trigger.schedule,
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.ruleArn = d.RuleArn;
        // console.log('Created scheduled Cloud Watch Event:', ctx.ruleArn);
        cb();
      }
    );
  }

  function connectQueueToExecutor(cb: any) {
    // console.log('Connecting executor to SQS...');
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
            // console.log('Executor already connected to SQS.');
            return cb();
          }
          return cb(e);
        }
        // console.log('Executor connected to SQS:', d.UUID);
        cb();
      }
    );
  }

  function createExecutor(cb: any) {
    // console.log('Creating cron executor Lambda function...');
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
      Environment: {
        Variables: {
          AWS_S3_BUCKET: config.getS3Bucket(awsConfig),
          CRON_CONCURRENT_EXECUTION_LIMIT: Config.executor.concurrentExecutionLimit.toString(),
          // LOGS_WS_URL: process.env.LOGS_WS_URL,
          // LOGS_WS_TOKEN_SIGNATURE_KEY: process.env.LOGS_WS_TOKEN_SIGNATURE_KEY,
          // LOGS_WS_TOKEN_EXPIRY: process.env.LOGS_WS_TOKEN_EXPIRY,
        },
      },
    };
    return lambda.createFunction(params, (e, d) => {
      if (e) {
        if (e.code === 'ResourceConflictException') {
          // console.log('Function already exists, updating...');
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
              (cb: any) => lambda.updateFunctionConfiguration(updateConfigurationParams, cb),
            ],
            (e: any, results: any[]) => {
              if (e) return cb(e);
              ctx.executorArn = results[0].FunctionArn;
              ctx.executorExisted = true;
              // console.log('Executor updated:', ctx.executorArn);
              return cb();
            }
          );
        }
        return cb(e);
      }
      ctx.executorArn = d.FunctionArn;
      // console.log('Executor created:', ctx.executorArn);
      return cb();
    });
  }

  function createScheduler(cb: any) {
    // console.log('Creating cron scheduler Lambda function...');
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
          AWS_S3_BUCKET: config.getS3Bucket(awsConfig),
          CRON_QUEUE_URL: ctx.queueUrl,
        },
      },
    };
    return lambda.createFunction(params, (e, d) => {
      if (e) {
        if (e.code === 'ResourceConflictException') {
          // console.log('Function already exists, updating...');
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
              (cb: any) => lambda.updateFunctionConfiguration(updateConfigurationParams, cb),
            ],
            (e: any, results: any[]) => {
              if (e) return cb(e);
              ctx.schedulerArn = results[0].FunctionArn;
              ctx.schedulerExisted = true;
              // console.log('Scheduler updated:', ctx.schedulerArn);
              return cb();
            }
          );
        }
        return cb(e);
      }
      ctx.schedulerArn = d.FunctionArn;
      // console.log('Scheduler created:', ctx.schedulerArn);
      cb();
    });
  }

  function setupDeadLetterQueue(cb: any) {
    // console.log('Creating SQS dead letter queue...');
    return sqs.createQueue(
      {
        QueueName: Config.queue.deadLetterName,
        Attributes: {},
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.deadLetterQueueUrl = d.QueueUrl;
        // console.log('Dead letter queue created:', d.QueueUrl);
        cb();
      }
    );
  }

  function getDeadLetterQueueArn(cb: any) {
    // console.log('Getting dead letter queue ARN...');
    sqs.getQueueAttributes(
      {
        QueueUrl: ctx.deadLetterQueueUrl,
        AttributeNames: ['QueueArn'],
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.deadLetterQueueArn = d.Attributes && d.Attributes.QueueArn;
        // console.log('Dead letter queue ARN:', ctx.deadLetterQueueArn);
        cb();
      }
    );
  }

  function getQueueArn(cb: any) {
    // console.log('Getting queue ARN...');
    sqs.getQueueAttributes(
      {
        QueueUrl: ctx.queueUrl,
        AttributeNames: ['QueueArn'],
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.queueArn = d.Attributes && d.Attributes.QueueArn;
        // console.log('Queue ARN:', ctx.queueArn);
        cb();
      }
    );
  }

  function setupQueue(cb: any) {
    // console.log('Creating SQS queue...');
    sqs.createQueue(
      {
        QueueName: Config.queue.name,
        Attributes: {
          VisibilityTimeout: (6 * Config.executor.timeout).toString(),
          RedrivePolicy: JSON.stringify({
            maxReceiveCount: Config.queue.maxReceiveCount.toString(),
            deadLetterTargetArn: ctx.deadLetterQueueArn,
          }),
        },
      },
      (e, d) => {
        if (e) return cb(e);
        ctx.queueUrl = d.QueueUrl;
        // console.log('Queue created:', d.QueueUrl);
        cb();
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
      timeout: 60,
      memory: 128,
      runtime: 'nodejs8.10',
      role: 'arn:aws:iam::321612923577:role/cron-executor', // pre-created
      batchSize: 10,
      concurrentExecutionLimit: '10',
    },

    // Lambda function that is triggered by scheduled Cloud Watch Events and populates SQS
    scheduler: {
      name: `${CronPrefix}cron-scheduler`,
      timeout: 60,
      memory: 128,
      runtime: 'nodejs8.10',
      role: 'arn:aws:iam::321612923577:role/cron-scheduler', // pre-created
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
