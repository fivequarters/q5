import { IExportConfig, IExportContext, bqInsert } from './utils';
import { AWSError } from 'aws-sdk';
import { ListObjectsV2Output } from 'aws-sdk/clients/s3';

interface ICronJob {
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
  schedule: {
    cron: string;
    timezone?: string;
  };
}

export async function exportFunction(ctx: IExportContext, config: IExportConfig) {
  let cronJobList: ICronJob[] = [];
  await collectCronJobs();
  let cronJobs: { [property: string]: ICronJob } = {}; // subscriptionId/boundaryId/functionId -> cron job
  cronJobList.forEach(x => {
    cronJobs[`${x.subscriptionId}/${x.boundaryId}/${x.functionId}`] = x;
  });
  await ctx.bq.query(
    `DELETE FROM \`dwh.function\` WHERE ts = '${config.ts}' AND deploymentId = '${config.deploymentId}'`
  );
  await exportFunctionCore();

  return;

  async function exportFunctionCore(continuationToken?: string) {
    var list_params = {
      Prefix: 'function-spec/',
      ContinuationToken: continuationToken,
      MaxKeys: config.maxBqInsertBatch,
    };

    await new Promise((resolve, reject) => {
      //@ts-ignore
      ctx.s3.listObjectsV2(list_params, async (e: AWSError, docs: ListObjectsV2Output) => {
        if (e) return reject(e);
        let bqInsertPayload = (docs.Contents as Object[]).map(x => {
          //@ts-ignore
          let tokens = x.Key.split('/');
          let item: any = {
            json: {
              ts: config.ts,
              deploymentId: config.deploymentId,
              accountId: config.subscription[tokens[1]] || 'NA',
              subscriptionId: tokens[1],
              boundaryId: tokens[2],
              functionId: tokens[3],
            },
          };
          item.insertId = `${item.json.deploymentId}/${item.json.subscriptionId}/${item.json.boundaryId}/${
            item.json.functionId
          }/${item.json.ts}`;
          let cron = cronJobs[`${item.json.subscriptionId}/${item.json.boundaryId}/${item.json.functionId}`];
          if (cron) {
            item.json.schedule = {
              cron: cron.schedule.cron,
            };
            if (cron.schedule.timezone) {
              item.json.schedule.timezone = cron.schedule.timezone;
            }
          }
          return item;
        });
        try {
          await bqInsert(ctx, 'function', bqInsertPayload);
        } catch (e) {
          return reject(e);
        }
        if (docs.IsTruncated) {
          try {
            await exportFunctionCore(docs.NextContinuationToken);
          } catch (e) {
            return reject(e);
          }
        }
        return resolve();
      });
    });
  }

  async function collectCronJobs(continuationToken?: string) {
    var list_params = {
      Prefix: 'function-cron/',
      ContinuationToken: continuationToken,
    };

    await new Promise((resolve, reject) => {
      //@ts-ignore
      ctx.s3.listObjectsV2(list_params, async (e: AWSError, docs: ListObjectsV2Output) => {
        if (e) return reject(e);
        cronJobList = cronJobList.concat(
          (docs.Contents as Object[]).map(x => {
            //@ts-ignore
            let tokens = x.Key.split('/');
            let scheduleArray = JSON.parse(Buffer.from(tokens[4], 'hex').toString('utf8'));
            return {
              subscriptionId: tokens[1],
              boundaryId: tokens[2],
              functionId: tokens[3],
              schedule: {
                cron: scheduleArray[0],
                timezone: scheduleArray[1],
              },
            };
          })
        );
        if (docs.IsTruncated) {
          await collectCronJobs(docs.NextContinuationToken);
        }
        resolve();
      });
    });
  }
}
