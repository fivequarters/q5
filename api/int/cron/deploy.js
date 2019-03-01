#!/usr/bin/env node

const AWS = require('aws-sdk');
const Async = require('async');
const Dotenv = require('dotenv');
const Fs = require('fs');
const Path = require('path');

Dotenv.config();

const Config = require('./cronConfig');
const DeploymentPackage = Fs.readFileSync(Path.join(__dirname, 'dist', 'cron.zip'));

let ctx = {};

AWS.config.apiVersions = {
  sqs: '2012-11-05',
  lambda: '2015-03-31',
  cloudwatchevents: '2015-10-07',
};

let sqs = new AWS.SQS();
let lambda = new AWS.Lambda();
let cloudwatchevents = new AWS.CloudWatchEvents();

return Async.series(
  [
    cb => setupDeadLetterQueue(cb),
    cb => getDeadLetterQueueArn(cb),
    cb => setupQueue(cb),
    cb => getQueueArn(cb),
    cb => createExecutor(cb),
    cb => connectQueueToExecutor(cb),
    cb => createScheduledTrigger(cb),
    cb => createScheduler(cb),
    cb => allowTriggerToExecuteScheduler(cb),
    cb => addSchedulerAsTriggerTarget(cb),
    // TODO, tjanczuk, create CloudTrail to track execution of this funnel and preserve historical record
  ],
  e => {
    if (e) throw e;
    console.log('CRON DEPLOYED SUCCESSFULLY');
  }
);

function addSchedulerAsTriggerTarget(cb) {
  console.log('Adding scheduler Lambda as target of scheduled Cloud Watch Event...');
  return cloudwatchevents.putTargets(
    {
      Rule: Config.trigger.name,
      Targets: [{ Arn: ctx.schedulerArn, Id: Config.trigger.name }],
    },
    (e, d) => {
      if (e) return cb(e);
      if (d.FailedEntryCount > 0)
        return cb(
          new Error(
            'Error adding scheduler Lambda as target of scheduled Cloud Watch Event: ' + JSON.stringify(d.null, 2)
          )
        );
      console.log('Added.');
      cb();
    }
  );
}

function allowTriggerToExecuteScheduler(cb) {
  console.log('Adding permissions for Cloud Watch Event to call scheduler Lambda...');
  return lambda.addPermission(
    {
      FunctionName: Config.scheduler.name,
      Action: 'lambda:InvokeFunction',
      Principal: 'events.amazonaws.com',
      SourceArn: ctx.ruleArn,
      StatementId: Config.scheduler.name,
    },
    e => {
      if (e) return cb(e);
      console.log('Added permissions.');
      cb();
    }
  );
}

function createScheduledTrigger(cb) {
  console.log('Creating scheduled Cloud Watch Event...');
  return cloudwatchevents.putRule(
    {
      Name: Config.trigger.name,
      Description: 'Trigger for CRON scheduler',
      ScheduleExpression: Config.trigger.schedule,
    },
    (e, d) => {
      if (e) return cb(e);
      ctx.ruleArn = d.RuleArn;
      console.log('Created scheduled Cloud Watch Event:', ctx.ruleArn);
      cb();
    }
  );
}

function connectQueueToExecutor(cb) {
  console.log('Connecting executor to SQS...');
  return lambda.createEventSourceMapping(
    {
      EventSourceArn: ctx.queueArn,
      FunctionName: Config.executor.name,
      Enabled: true,
      BatchSize: Config.executor.batchSize,
    },
    (e, d) => {
      if (e) return cb(e);
      ctx.executorMapping = d.UUID;
      console.log('Executor connected to SQS:', ctx.executorMapping);
      cb();
    }
  );
}

function createExecutor(cb) {
  console.log('Creating cron executor Lambda function...');
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
        AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
        CRON_CONCURRENT_EXECUTION_LIMIT: Config.executor.concurrentExecutionLimit,
      },
    },
  };
  return lambda.createFunction(params, (e, d) => {
    if (e) return cb(e);
    ctx.executorArn = d.FunctionArn;
    console.log('Executor created:', ctx.executorArn);
    cb();
  });
}

function createScheduler(cb) {
  console.log('Creating cron scheduler Lambda function...');
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
        CRON_MAX_EXECUTIONS_PER_WINDOW: Config.scheduler.maxExecutionsPerWindow,
        AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
        CRON_QUEUE_URL: ctx.queueUrl,
      },
    },
  };
  return lambda.createFunction(params, (e, d) => {
    if (e) return cb(e);
    ctx.schedulerArn = d.FunctionArn;
    console.log('Scheduler created:', ctx.schedulerArn);
    cb();
  });
}

function setupDeadLetterQueue(cb) {
  console.log('Creating SQS dead letter queue...');
  return sqs.createQueue(
    {
      QueueName: Config.queue.deadLetterName,
      Attributes: {},
    },
    (e, d) => {
      if (e) return cb(e);
      ctx.deadLetterQueueUrl = d.QueueUrl;
      console.log('Dead letter queue created:', d.QueueUrl);
      cb();
    }
  );
}

function getDeadLetterQueueArn(cb) {
  console.log('Getting dead letter queue ARN...');
  sqs.getQueueAttributes(
    {
      QueueUrl: ctx.deadLetterQueueUrl,
      AttributeNames: ['QueueArn'],
    },
    (e, d) => {
      if (e) return cb(e);
      ctx.deadLetterQueueArn = d.Attributes.QueueArn;
      console.log('Dead letter queue ARN:', ctx.deadLetterQueueArn);
      cb();
    }
  );
}

function getQueueArn(cb) {
  console.log('Getting queue ARN...');
  sqs.getQueueAttributes(
    {
      QueueUrl: ctx.queueUrl,
      AttributeNames: ['QueueArn'],
    },
    (e, d) => {
      if (e) return cb(e);
      ctx.queueArn = d.Attributes.QueueArn;
      console.log('Queue ARN:', ctx.queueArn);
      cb();
    }
  );
}

function setupQueue(cb) {
  console.log('Creating SQS queue...');
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
      console.log('Queue created:', d.QueueUrl);
      cb();
    }
  );
}
