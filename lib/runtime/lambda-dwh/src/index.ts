/**
 * This is a Lambda function designed to run daily to take a snapshot of Fusebit operational data
 * and export it to GC BigQuery. It is designed to be re-entrant and eventually consistent when
 * run several times the same day.
 *
 * The following environment variables MUST be set:
 * FUSEBIT_GC_BQ_KEY_BASE64 - base64-encoded JSON representing GC service account credentials with permissions to write to BQ
 * AWS_S3_BUCKET - the S3 bucket where functions are stored
 * DEPLOYMENT_ID - deploymentId of the Fusebit deployment, e.g. 'beta'
 *
 * The following environment variables MAY be set:
 * MAX_BQ_INSERT_BATCH - maximum number of rows inserted into BQ at one time. Default 500.
 *
 */

import * as AWS from 'aws-sdk';
import { BigQuery } from '@google-cloud/bigquery';
import { exportFunction } from './exportFunction';
import { exportAccount } from './exportAccount';
import { exportAgent } from './exportAgent';
import { exportSubscription } from './exportSubscription';
import { exportAccess } from './exportAccess';
import { exportIdentity } from './exportIdentity';
import { exportIssuer } from './exportIssuer';
import { AWSError } from 'aws-sdk';
import { ScanOutput } from 'aws-sdk/clients/dynamodb';
import { IExportConfig } from './utils';

export async function handler(event: any, context: any, cb: any) {
  if (!process.env.FUSEBIT_GC_BQ_KEY_BASE64) {
    throw new Error(
      'The FUSEBIT_GC_BQ_KEY_BASE64 environment variable must be set to base64-encoded JSON representation of Google Cloud service account credentials that will be used to call Big Quuery APIs.'
    );
  }
  if (!process.env.AWS_S3_BUCKET) {
    throw new Error(
      'The AWS_S3_BUCKET environment variable must be set to the S3 bucket where functions to be exported are stored.'
    );
  }
  if (!process.env.DEPLOYMENT_ID) {
    throw new Error('The DEPLOYMENT_ID environment variable must be set.');
  }

  const gcCredentials = JSON.parse(Buffer.from(process.env.FUSEBIT_GC_BQ_KEY_BASE64, 'base64').toString('utf8'));

  const ctx = {
    s3: new AWS.S3({
      apiVersion: '2006-03-01',
      signatureVersion: 'v4',
      region: process.env.AWS_REGION,
      params: {
        Bucket: process.env.AWS_S3_BUCKET,
      },
    }),
    bq: new BigQuery({
      projectId: gcCredentials.project_id,
      credentials: gcCredentials,
    }),
    dynamo: new AWS.DynamoDB({
      apiVersion: '2012-08-10',
    }),
  };

  let config: IExportConfig = {
    ts: event.ts,
    deploymentId: process.env.DEPLOYMENT_ID as string,
    maxBqInsertBatch: +(process.env.MAX_BQ_INSERT_BATCH as string) || 500,
    subscription: {},
  };
  if (!config.ts) {
    let now = new Date();
    now.setUTCHours(0);
    now.setUTCMinutes(0);
    now.setUTCSeconds(0);
    now.setUTCMilliseconds(0);
    config.ts = now.toISOString();
  }

  console.log('START DWH EXPORT:', config);

  await collectSubscriptionAccounts();
  await Promise.all([
    exportFunction(ctx, config),
    exportAccount(ctx, config),
    exportAgent(ctx, config),
    exportSubscription(ctx, config),
    exportAccess(ctx, config),
    exportIdentity(ctx, config),
    exportIssuer(ctx, config),
  ])
    .then((_) => {
      console.log('DWH EXPORT SUCCESS.');
    })
    .catch((e) => {
      console.log('DWH EXPORT ERROR:', e);
    });
  return cb();

  async function collectSubscriptionAccounts() {
    await new Promise((resolve, reject) => {
      ctx.dynamo.scan(
        {
          TableName: `${process.env.DEPLOYMENT_ID}.subscription`,
        },
        (e: AWSError, data: ScanOutput) => {
          if (e) return reject(e);
          //@ts-ignore
          data.Items.forEach((x: { accountId: { S: string }; subscriptionId: { S: string } }) => {
            config.subscription[x.subscriptionId.S] = x.accountId.S;
          });
          resolve();
        }
      );
    });
  }
}
