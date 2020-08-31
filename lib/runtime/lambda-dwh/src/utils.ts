import { S3, DynamoDB, AWSError } from 'aws-sdk';
import { BigQuery } from '@google-cloud/bigquery';
import { ScanOutput } from 'aws-sdk/clients/dynamodb';

export interface IExportContext {
  s3: S3;
  bq: BigQuery;
  dynamo: DynamoDB;
}

export interface IExportConfig {
  ts: string;
  maxBqInsertBatch: number;
  deploymentId: string;
  subscription: ISubscriptionAccount;
}

export interface ISubscriptionAccount {
  [property: string]: string; // subscriptionId -> accountId hash
}

export async function bqInsert(ctx: IExportContext, table: string, payload: any[]) {
  if (payload.length === 0) {
    console.log(`SUCCESS no records to insert into the dwh.${table} table in Big Query`);
    return;
  }
  return (
    //@ts-ignore
    ctx.bq
      .dataset('dwh')
      .table(table)
      .insert(payload, { raw: true })
      .then(async () => {
        console.log(`SUCCESS inserting ${payload.length} records to dwh.${table} table in Big Query`);
      })
      .catch((e: any) => {
        console.log(`ERROR inserting ${payload.length} records to dwh.${table} table in Big Query`, e.message);
        console.log('ERROR[0]', e.errors ? JSON.stringify(e.errors[0], null, 2) : 'NA');
      })
  );
}

export async function exportDynamoTable(
  ctx: IExportContext,
  config: IExportConfig,
  dynamoTable: string,
  bqTable: string,
  itemMapper: (x: any) => any
) {
  await exportDynamoTableCore();

  return;

  async function exportDynamoTableCore(lastEvaluatedKey?: DynamoDB.Key) {
    await new Promise((resolve, reject) => {
      ctx.dynamo.scan(
        {
          TableName: `${process.env.DEPLOYMENT_ID}.${dynamoTable}`,
          Limit: config.maxBqInsertBatch,
          ExclusiveStartKey: lastEvaluatedKey,
        },
        async (e: AWSError, data: ScanOutput) => {
          if (e) return reject(e);
          //@ts-ignore
          let bqInsertPayload = data.Items.map(itemMapper);
          try {
            await bqInsert(ctx, bqTable, bqInsertPayload);
          } catch (e) {
            return reject(e);
          }
          if (data.LastEvaluatedKey) {
            try {
              await exportDynamoTableCore(data.LastEvaluatedKey);
            } catch (e) {
              return reject(e);
            }
          }
          return resolve();
        }
      );
    });
  }
}
