#!/usr/bin/env node

const AWS = require('aws-sdk');
const Async = require('async');
const Dotenv = require('dotenv');

Dotenv.config();

const Config = require('./cronConfig');

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
    cb => deleteQueue(Config.queue.deadLetterName, cb),
    cb => deleteQueue(Config.queue.name, cb),
    cb => deleteEventSourceMappings(Config.executor.name, cb),
    cb => deleteLambda(Config.executor.name, cb),
    cb => deleteScheduledTriggerTargets(cb),
    cb => deleteScheduledTrigger(cb),
    cb => deleteLambda(Config.scheduler.name, cb),
  ],
  e => {
    if (e) throw e;
    console.log('CRON DESTROYED SUCCESSFULLY');
  }
);

function deleteScheduledTriggerTargets(cb) {
  console.log(`Deleting rule targets for Cloud Watch Event '${Config.trigger.name}'...`);
  return cloudwatchevents.listTargetsByRule({ Rule: Config.trigger.name }, (e, d) => {
    if (e) {
      console.log('Error deleting rule targets:', e.message);
      cb();
    } else {
      let ids = d.Targets.map(t => t.Id);
      if (ids.length > 0) {
        return cloudwatchevents.removeTargets({ Ids: ids, Rule: Config.trigger.name }, (e, d) => {
          if (e) console.log('Error deleting rule targets', e.message);
          else console.log('Deleted rule targets');
          cb();
        });
      } else {
        console.log('No targets to delete');
        cb();
      }
    }
  });
}

function deleteScheduledTrigger(cb) {
  console.log(`Deleting Cloud Watch Event '${Config.trigger.name}'...`);
  return cloudwatchevents.deleteRule(
    {
      Name: Config.trigger.name,
    },
    e => {
      if (e) console.log('Error deleting scheduled Cloud Watch Event:', e.message);
      else console.log('Deleted scheduled Cloud Watch Event.');
      cb();
    }
  );
}

function deleteEventSourceMappings(name, cb) {
  console.log(`Deleting event source mappings for Lambda function '${name}'...`);
  return lambda.listEventSourceMappings({ FunctionName: name }, (e, d) => {
    if (e) {
      console.log('Error deleting event source mappings for Lambda:', e.message);
      cb();
    } else {
      if (d.EventSourceMappings.length > 0) {
        return Async.each(
          d.EventSourceMappings,
          (mapping, cb) =>
            lambda.deleteEventSourceMapping({ UUID: mapping.UUID }, e => {
              if (e) console.log('Error deleting UUID mapping:', mapping.UUID, e.message);
              else console.log('Deleted event mapping:', mapping.UUID);
              cb();
            }),
          cb
        );
      } else {
        console.log('No event mappings to delete.');
        cb();
      }
    }
  });
}

function deleteLambda(name, cb) {
  console.log(`Deleting Lambda function '${name}'...`);
  return lambda.deleteFunction(
    {
      FunctionName: name,
    },
    (e, d) => {
      if (e) console.log('Error deleting Lambda:', e.message);
      else console.log('Function deleted');
      cb();
    }
  );
}

function deleteQueue(queueName, cb) {
  console.log(`Deleting SQS queue '${queueName}'...`);
  return sqs.getQueueUrl({ QueueName: queueName }, (e, d) => {
    if (e) {
      console.log('Error deleting queue:', e.message);
      return cb();
    } else {
      return sqs.deleteQueue(
        {
          QueueUrl: d.QueueUrl,
        },
        (e, d) => {
          if (e) console.log('Error deleting queue:', e.message);
          else console.log('Queue deleted');
          cb();
        }
      );
    }
  });
}
