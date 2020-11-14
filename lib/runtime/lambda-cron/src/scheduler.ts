import * as AWS from 'aws-sdk';
import * as Async from 'async';
import * as Cron from 'cron-parser';
import { v4 as uuidv4 } from 'uuid';

import * as Constants from '@5qtrs/constants';
import { Constants as Tags } from '@5qtrs/function-tags';

import { mintJwtForPermissions, loadFunctionSummary, AwsKeyStore, SubscriptionCache } from '@5qtrs/runas';

import { pollOnce, is_logging_enabled, addLogPermission, getLogUrl } from '@5qtrs/runtime-common';

const filter = eval(process.env.CRON_FILTER || 'ctx => true;');
const MAX_EXECUTIONS_PER_WINDOW = +(process.env.CRON_MAX_EXECUTIONS_PER_WINDOW as string) || 120;
const SQS_QUEUE_URL = process.env.CRON_QUEUE_URL as string;
const SQS_MAX_DELAY = 15 * 60; // 15 minutes, as per spec.
const MAX_PARALLEL_LOOKUP = 20; // Only lookup 20 functions at a time from Dynamo

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
});

const sqs = new AWS.SQS({
  apiVersion: '2012-11-05',
});

// Create and load a cache with the current subscription->account mapping
const subscriptionCache = new SubscriptionCache({});
const subscriptionCacheHealth = subscriptionCache.refresh();

// Create the keystore and guarantee an initial key
const keyStore = new AwsKeyStore({
  // Maximum key lifetime is three hours
  maxKeyTtl: 3 * 60 * 60 * 1000,
  // Let the JWTs last for 30 minutes, since they will be scheduled at most 15 minutes in the future.
  jwtValidDuration: 30 * 60 * 1000,
  // Rekey every hour
  rekeyInterval: 60 * 60 * 1000,
});
const keyStoreHealth = keyStore.rekey();

// Entrypoint for the scheduler
export async function scheduler(event: any, context: any, cbScheduler: any) {
  // Make sure both of these processes have completed before continuing, and trigger the realtime logging
  // system to poll once.
  await Promise.all([subscriptionCacheHealth, keyStoreHealth, new Promise((resolve, reject) => pollOnce(resolve))]);

  // Give the keystore an opportunity to rekey on long-lived lambdas
  await keyStore.healthCheck();

  // Track some stats about the execution of this scheduler
  const stats = {
    considered: 0,
    scheduled: 0,
    failed: 0,
  };

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
  await Constants.asyncPool(MAX_PARALLEL_LOOKUP, contents, async (entry) => {
    try {
      // Format of the S3 key is 'function-cron/{subscriptionId}/{boundaryId}/{functionId}/{encoded_schedule}'
      const segments = entry.Key.split('/');

      const ctx: { [property: string]: string | any | undefined } = {
        key: entry.Key,
        subscriptionId: segments[1],
        boundaryId: segments[2],
        functionId: segments[3],
      };

      // Does this fail a hardcoded filter on the cron lambda?
      if (!filter(ctx)) {
        return;
      }

      // Get the accountId
      const sub = await subscriptionCache.find(segments[1]);
      if (!sub) {
        console.log(`ERROR: Unable to find account for ${segments[1]}`);
        return;
      }
      ctx.accountId = sub.accountId;

      // Load the desired function summary from DynamoDB
      let functionSummary;
      try {
        functionSummary = await loadFunctionSummary(ctx);
      } catch (e) {
        console.log(
          `ERROR: Unable to load summary for ${ctx.accountId}/${ctx.subscriptionId}/${ctx.boundaryId}/${ctx.functionId}: ${e}`
        );
        return;
      }

      console.log(`X1 ${getLogUrl(ctx)} ${is_logging_enabled(ctx)}`);
      if (true || is_logging_enabled(ctx)) {
        // Add the realtime logging permissions to the summary.
        addLogPermission(ctx, functionSummary);
      }

      // Mint a JWT, if necessary, and add it to the context.
      ctx.functionAccessToken = await mintJwtForPermissions(
        keyStore,
        ctx,
        functionSummary[Tags.get_compute_tag_key('permissions')],
        'cron'
      );

      if (true || is_logging_enabled(ctx)) {
        console.log(`Enabling logging for ${getLogUrl(ctx)}`);
        // Add the realtime logging configuration to the ctx
        ctx.logs = {
          token: ctx.functionAccessToken,
          path: `/v1/${getLogUrl(ctx)}`,
          host: Constants.API_PUBLIC_ENDPOINT.replace(/http[s]?:\/\//i, ''),
          protocol: 'https',
        };
      }

      console.log(`${JSON.stringify(ctx.logs)}`);

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
    } catch (e) {
      // Prevent the failure of any one lookup from early-terminating the Promise.all()
      console.log(e);
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
