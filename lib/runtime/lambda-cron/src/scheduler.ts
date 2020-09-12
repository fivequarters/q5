import * as AWS from 'aws-sdk';
import * as Async from 'async';
import * as Cron from 'cron-parser';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
});
const sqs = new AWS.SQS({
  apiVersion: '2012-11-05',
});
const filter = eval(process.env.CRON_FILTER || 'ctx => true;');
const maxExecutionsPerWindow = +(<string>process.env.CRON_MAX_EXECUTIONS_PER_WINDOW) || 120;
const queueUrl = <string>process.env.CRON_QUEUE_URL;

export function scheduler(event: any, context: any, cb: any) {
  let sqsEntries: any[] = [];
  let stats = {
    considered: 0,
    scheduled: 0,
    failed: 0,
  };
  let listedCronJobs: AWS.S3.ListObjectsV2Output;

  // Compute a 10m time window starting from the next full 10m of the hour
  // i.e. if it is 12:03 now, fromTime will be 12:10 and toTime 12:20
  let fromTime = new Date(new Date().getTime() + 10 * 60000);
  fromTime.setMinutes(Math.floor(fromTime.getMinutes() / 10) * 10);
  fromTime.setSeconds(0);
  fromTime.setMilliseconds(0);
  let toTime = new Date(fromTime.getTime() + 10 * 60 * 1000);

  return processCronJobs(undefined, cb);

  function processCronJobs(continuationToken: string | undefined, cb: any): any {
    return Async.series([(cb) => listCronJobs(cb), (cb) => sendToSqs(cb)], (e) => {
      if (e) return cb(e);
      if (listedCronJobs.IsTruncated) {
        return processCronJobs(listedCronJobs.NextContinuationToken, cb);
      } else {
        console.log('DONE', stats);
        return cb(null, stats);
      }
    });

    function listCronJobs(cb: any) {
      return s3.listObjectsV2(
        {
          Bucket: <string>process.env.AWS_S3_BUCKET,
          Prefix: 'function-cron/',
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        },
        (e, d) => {
          if (e) return cb(e);
          listedCronJobs = d;
          scheduleExecutions(d.Contents || []);
          cb();
        }
      );
    }

    function scheduleExecutions(contents: any[]) {
      stats.considered += contents.length;
      contents.forEach((i) => {
        // Format of the S3 key is 'function-cron/{subscriptionId}/{boundaryId}/{functionId}/{encoded_schedule}'
        let segments = i.Key.split('/');
        let ctx: { [property: string]: string } = {
          key: i.Key,
          subscriptionId: segments[1],
          boundaryId: segments[2],
          functionId: segments[3],
        };
        if (!filter(ctx)) return;
        let tmp = JSON.parse(Buffer.from(segments[4], 'hex').toString());
        ctx.cron = tmp[0];
        ctx.timezone = tmp[1];
        let cron = Cron.parseExpression(ctx.cron, {
          currentDate: fromTime,
          endDate: toTime,
          tz: ctx.timezone,
        });
        let now = new Date();
        for (let i = 0; i < maxExecutionsPerWindow; i++) {
          let at;
          try {
            at = cron.next();
          } catch (_) {
            break;
          }
          sqsEntries.push({
            Id: uuidv4(),
            DelaySeconds: Math.floor(Math.max(0, at.getTime() - now.getTime()) / 1000),
            MessageBody: JSON.stringify(ctx),
          });
        }
      });
    }

    function sendToSqs(cb: any): any {
      if (sqsEntries.length === 0) return cb();
      return sqs.sendMessageBatch(
        {
          QueueUrl: queueUrl,
          Entries: sqsEntries.splice(0, 10),
        },
        (e, d) => {
          if (e) return cb(e);
          stats.failed += (d.Failed && d.Failed.length) || 0;
          stats.scheduled += (d.Successful && d.Successful.length) || 0;
          return sendToSqs(cb);
        }
      );
    }
  }
}
