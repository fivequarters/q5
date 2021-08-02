import * as AWS from 'aws-sdk';
import * as Async from 'async';
import * as Cron from 'cron-parser';
import { v4 as uuidv4 } from 'uuid';

import * as Constants from '@5qtrs/constants';

import { SubscriptionCache } from '@5qtrs/account';

const filter = eval(process.env.CRON_FILTER || 'ctx => true;');
const MAX_PARALLEL_LOOKUP = 20; // Only lookup 20 functions at a time from Dynamo
const MAX_EXECUTIONS_PER_WINDOW = +(process.env.CRON_MAX_EXECUTIONS_PER_WINDOW as string) || 120;
const SQS_QUEUE_URL = process.env.CRON_QUEUE_URL as string;
const SQS_MAX_DELAY = 15 * 60; // 15 minutes, as per spec.

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
});

const sqs = new AWS.SQS({
  apiVersion: '2012-11-05',
});

// Create and load a cache with the current subscription->account mapping
const subscriptionCache = new SubscriptionCache({});
let subscriptionCacheHealth: Promise<any>;

// Entrypoint for the scheduler
export async function scheduler(event: any, context: any, cbScheduler: any) {
  // Track some stats about the execution of this scheduler
  const stats = {
    considered: 0,
    scheduled: 0,
    failed: 0,
  };

  if (subscriptionCacheHealth === undefined) {
    subscriptionCacheHealth = subscriptionCache.refresh();
  }

  // Make sure that the cache is loaded so that accountId information can be added to the requests.
  await subscriptionCacheHealth;

  // Compute a 10m time window starting from the next full 10m of the hour
  // i.e. if it is 12:03 now, fromTime will be 12:10 and toTime 12:20
  const fromTime = new Date(new Date().getTime() + 10 * 60000);
  fromTime.setMinutes(Math.floor(fromTime.getMinutes() / 10) * 10);
  fromTime.setSeconds(0);
  fromTime.setMilliseconds(0);
  const toTime = new Date(fromTime.getTime() + 10 * 60 * 1000);

  let listedCronJobs: AWS.S3.ListObjectsV2Output = {};

  // Start processing the scheduled cron jobs
  do {
    listedCronJobs = await listCronJobs(listedCronJobs.NextContinuationToken);
    const sqsEntries = await scheduleExecutions(stats, listedCronJobs.Contents || [], fromTime, toTime);
    await sendToSqs(stats, sqsEntries);
  } while (listedCronJobs.NextContinuationToken);

  console.log('DONE', stats);
  return stats;
}

// Get all of the active cron jobs
async function listCronJobs(continuationToken: string | undefined) {
  return s3
    .listObjectsV2({
      Bucket: process.env.AWS_S3_BUCKET as string,
      Prefix: 'function-cron/',
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    })
    .promise();
}

// Determine if, or when, the job should next execute again.
async function scheduleExecutions(stats: any, contents: any[], fromTime: Date, toTime: Date) {
  const sqsEntries: any[] = [];

  stats.considered += contents.length;

  // Load all of the functions in parallel
  await Constants.asyncPool(MAX_PARALLEL_LOOKUP, contents, async (entry: any) => {
    // Format of the S3 key is 'function-cron/{subscriptionId}/{boundaryId}/{functionId}/{encoded_schedule}'
    const segments = entry.Key.split('/');

    const ctx: { [property: string]: string | any | undefined } = {
      key: entry.Key,
      subscriptionId: segments[1],
      boundaryId: segments[2],
      functionId: segments[3],
    };

    try {
      // Artificially lookup the accountId since that's not in the S3 key.
      const sub = await subscriptionCache.find(ctx.subscriptionId);
      if (!sub) {
        console.log(`ERROR: Unable to find account for ${ctx.subscriptionId}`);
        return;
      }
      ctx.accountId = sub.accountId;
    } catch (e) {
      console.log(`ERROR: Unable to access subscription cache for ${ctx.subscriptionId}`);
      return;
    }

    // Does this fail a hardcoded filter on the cron lambda?
    if (!filter(ctx)) {
      return;
    }

    // Parse the encoded schedule
    const tmp = JSON.parse(Buffer.from(segments[4], 'hex').toString());
    ctx.cron = tmp[0];
    ctx.timezone = tmp[1];
    const cron = Cron.parseExpression(ctx.cron as string, {
      currentDate: fromTime,
      endDate: toTime,
      tz: ctx.timezone,
    });
    const now = new Date();

    // Schedule the specified number of executions during the window, based on the schedule
    for (let n = 0; n < MAX_EXECUTIONS_PER_WINDOW; n++) {
      let at;
      try {
        at = cron.next();
      } catch (_) {
        break;
      }

      const delay = Math.floor(Math.max(0, at.getTime() - now.getTime()) / 1000);
      if (delay > SQS_MAX_DELAY) {
        break;
      }

      sqsEntries.push({
        Id: uuidv4(), // Unique, non-conflicting ID
        DelaySeconds: delay,
        MessageBody: JSON.stringify(ctx),
      });
    }
  });

  return sqsEntries;
}

async function sendToSqs(stats: any, sqsEntries: any[]) {
  while (sqsEntries.length !== 0) {
    const d = await sqs
      .sendMessageBatch({
        QueueUrl: SQS_QUEUE_URL,
        Entries: sqsEntries.splice(0, 10),
      })
      .promise();

    stats.failed += (d.Failed && d.Failed.length) || 0;
    stats.scheduled += (d.Successful && d.Successful.length) || 0;
  }
}
