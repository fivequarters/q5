import * as Async from 'async';
import * as AWS from 'aws-sdk';
import * as Cron from 'cron-parser';
import { v4 as uuidv4 } from 'uuid';

import { Constants as Tags } from '@5qtrs/function-tags';
import * as Constants from '@5qtrs/constants';
import * as Common from '@5qtrs/runtime-common';

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
});

import { mintJwtForPermissions, loadFunctionSummary, AwsKeyStore, SubscriptionCache } from '@5qtrs/runas';

const maxParallelLookup = 20; // Only lookup 20 functions at a time from Dynamo
const concurrentExecutionLimit = +(process.env.CRON_CONCURRENT_EXECUTION_LIMIT as string) || 5;

// Create the keystore and guarantee an initial key
const keyStore = new AwsKeyStore({
  // Maximum key lifetime is three hours
  maxKeyTtl: 3 * 60 * 60 * 1000,
  // Let the JWTs last for 30 minutes, since they will be scheduled at most 15 minutes in the future.
  jwtValidDuration: 30 * 60 * 1000,
  // Rekey every hour
  rekeyInterval: 60 * 60 * 1000,
});
let keyStoreHealth: Promise<any>;

export async function executor(event: any, context: any) {
  if (keyStoreHealth === undefined) {
    keyStoreHealth = keyStore.rekey();
  }

  // Make sure both of these processes have completed before continuing, and trigger the realtime logging
  // system to poll once on each invocation of the executor.
  await Promise.all([
    keyStoreHealth,
    new Promise((resolve, reject) =>
      Common.pollOnce((e: any) => {
        if (e) {
          return reject(e);
        }
        resolve();
      })
    ),
  ]);

  const result: any = {
    success: [],
    failure: [],
    skipped: [],
  };

  await Constants.asyncPool(concurrentExecutionLimit, event.Records, async (msg: any) => {
    const ctx = JSON.parse(msg.body);

    try {
      const exists = await checkCronStillExists(ctx.key);

      console.log(exists ? 'RUNNING CRON JOB' : 'SKIPPING CRON JOB', ctx);
      if (!exists) {
        result.skipped.push(ctx.key);
        return;
      }

      await executeFunction(ctx);
      result.success.push({ key: ctx.key, logs: ctx.logs ? 'enabled' : 'disabled' });
    } catch (e) {
      result.failure.push({ key: ctx.key, error: `${e}` });
    }
  });

  console.log(`RESULTS: ${JSON.stringify(result)}`);
  return {};
}

async function checkCronStillExists(key: string) {
  try {
    const d = await s3.headObject({ Bucket: process.env.AWS_S3_BUCKET as string, Key: key }).promise();
    return !!d;
  } catch (e) {
    return false;
  }
}

async function executeFunction(ctx: any) {
  // Load the desired function summary from DynamoDB
  let functionSummary;
  try {
    functionSummary = await loadFunctionSummary(ctx);
  } catch (e) {
    console.log(
      `ERROR: Unable to load summary for ${ctx.accountId}/${ctx.subscriptionId}/${ctx.boundaryId}/${ctx.functionId}: ${e}`
    );
    throw e;
  }

  // Add any necessary security tokens to the request.
  await addSecurityTokens(ctx, functionSummary);

  ctx.version = Constants.getFunctionVersion(functionSummary);

  const { startTime, deviation } = calculateCronDeviation(ctx.cron, ctx.timezone);

  // Generate a pseudo-request object to drive the invocation.
  const request = {
    method: 'CRON',
    url: `${Constants.get_function_path(ctx.subscriptionId, ctx.boundaryId, ctx.functionId)}`,
    body: ctx,
    originalUrl: `/v1${Constants.get_function_path(ctx.subscriptionId, ctx.boundaryId, ctx.functionId)}`,
    protocol: 'cron',
    headers: {},
    query: {},
    params: ctx,
    requestId: uuidv4(),
    startTime,
    functionSummary: functionSummary
  };

  request.params.baseUrl = Constants.get_function_location(
    { headers: { 'x-forwarded-proto': 'https', host: Constants.API_PUBLIC_ENDPOINT.replace(/http[s]?:\/\//i, '') } },
    ctx.subscriptionId,
    ctx.boundaryId,
    ctx.functionId
  );
  
  // Execute, and record the results.
  await new Promise((resolve, reject) =>
    Common.invoke_function(request, (error: any, response: any, meta: any) => {
      meta.metrics.cron = { deviation };
      dispatchCronEvent({ request, error, response, meta });

      if (error) {
        reject(error);
      } else {
        resolve(ctx);
      }
    })
  );
}

// Add tokens for both RunAs permissions as well as any logging permissions that are needed.
async function addSecurityTokens(ctx: any, functionSummary: any) {
  // Mint a JWT, if necessary, and add it to the context.
  ctx.functionAccessToken = await mintJwtForPermissions(
    keyStore,
    ctx,
    Constants.getFunctionPermissions(functionSummary),
    'cron'
  );

  // Add the realtime logging configuration to the ctx
  ctx.logs = await Common.createLoggingCtx(
    keyStore,
    ctx,
    'https',
    Constants.API_PUBLIC_ENDPOINT.replace(/http[s]?:\/\//i, '')
  );

  return functionSummary;
}

// Calculate the deviation from the actual expected time to now.
function calculateCronDeviation(expression: string, timezone: string) {
  const startTime = Date.now();
  const deviation =
    startTime -
    Date.parse(
      Cron.parseExpression(expression, {
        currentDate: startTime,
        tz: timezone,
      })
        .prev()
        .toString()
    );

  return { startTime, deviation };
}

function dispatchCronEvent(details: any) {
  const fusebit = {
    accountId: details.request.params.accountId,
    subscriptionId: details.request.params.subscriptionId,
    boundaryId: details.request.params.boundaryId,
    functionId: details.request.params.functionId,
    deploymentKey: process.env.DEPLOYMENT_KEY,
    mode: 'cron',
    modality: 'execution',
  };

  const event = {
    requestId: details.request.requestId,
    startTime: details.request.startTime,
    endTime: Date.now(),
    request: details.request,
    metrics: details.meta.metrics,
    response: { statusCode: 200, headers: [] },
    fusebit,
    error: details.meta.error || details.error, // The meta error always has more information.
  };

  // Make sure the response.statusCode is populated so that it shows up in analytics reports
  if (details.response && details.response.statusCode) {
    event.response = { statusCode: details.response.statusCode, headers: details.response.headers || [] };
  } else if (details.error) {
    event.response = { statusCode: details.error.statusCode || 501, headers: [] };
  }

  Common.dispatch_event(event);
}
