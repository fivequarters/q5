import * as AWS from 'aws-sdk';
import Cron from 'cron-parser';

import * as Constants from '@5qtrs/constants';
import * as Common from '@5qtrs/runtime-common';

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
});

import { mintJwtForPermissions, loadFunctionSummary, AwsKeyStore, getExactRoute, getMatchingRoute } from '@5qtrs/runas';

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

async function getFunctionTags(ctx: any) {
  // Load the desired function summary from DynamoDB
  try {
    return await loadFunctionSummary(ctx);
  } catch (e) {
    console.log(
      `ERROR: Unable to load summary for ${ctx.accountId}/${ctx.subscriptionId}/${ctx.boundaryId}/${ctx.functionId}: ${e}`
    );
    throw e;
  }
}

export async function executor(event: any) {
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
        resolve(undefined);
      })
    ),
  ]);

  const result: any = {
    success: [],
    failure: [],
    skipped: [],
  };

  const processCron = async (ctx: any) => {
    try {
      const exists = await checkCronStillExists(ctx.key);

      console.log(exists ? 'RUNNING CRON JOB' : 'SKIPPING CRON JOB', ctx);
      if (!exists) {
        result.skipped.push(ctx.key);
        return;
      }

      const functionSummary = await getFunctionTags(ctx);
      await executeFunction(ctx, functionSummary, false);
      result.success.push({ type: 'cron', key: ctx.key, logs: ctx.logs ? 'enabled' : 'disabled' });
    } catch (e) {
      result.failure.push({ type: 'cron', key: ctx.key, error: `${e}` });
    }
  };

  const getTaskAddress = (envelope: any) => ({
    accountId: envelope.ctx.accountId,
    subscriptionId: envelope.ctx.subscriptionId,
    boundaryId: envelope.ctx.boundaryId,
    functionId: envelope.ctx.functionId,
    taskId: envelope.taskId,
  });

  const rescheduleTask = async (envelope: any) => {
    const taskAddress = getTaskAddress(envelope);
    try {
      const functionSummary = await getFunctionTags(envelope.ctx);
      const route = functionSummary.routes && getExactRoute(functionSummary.routes, envelope.matchingRoutePath);
      const taskConfig = route?.task;
      if (!taskConfig) {
        throw new Error(
          `Unable to reschedule task ${Common.getTaskKey(taskAddress)} because the original task scheduling route '${
            envelope.matchingRoutePath
          }' is no longer exists. The task is abandoned.`
        );
      }
      await Common.scheduleTaskAsync(taskConfig, envelope);
    } catch (e) {
      try {
        await Common.updateTaskStatusAsync({
          ...taskAddress,
          status: 'error',
          error: {
            statusCode: 500,
            message: (e as any).stack || (e as any).message || e,
          },
        });
      } catch (e1) {
        console.log('ERROR TRANSITIONING TO FAILED STATE AFTER TASK RESCHEDULING ERROR', taskAddress, e, e1);
        // do nothing
      }
    }
  };

  const runTask = async (envelope: any) => {
    const taskAddress = getTaskAddress(envelope);
    console.log('RUNNING TASK', {
      ...taskAddress,
      scheduledAt: envelope.scheduledAt,
      notBefore: envelope.ctx.headers?.[Constants.NotBeforeHeader],
    });
    const ctx = envelope.ctx;
    ctx.method = 'TASK';
    ctx.headers = {
      ...ctx.headers,
      'fusebit-task-id': envelope.taskId,
      'fusebit-task-scheduled-at': envelope.scheduledAt.toString(),
      'fusebit-task-executing-at': Date.now().toString(),
      'fusebit-task-route': envelope.matchingRoutePath,
    };
    const key = `${ctx.accountId}/${ctx.subscriptionId}/${ctx.boundaryId}/${ctx.functionId}/${ctx.path}`;
    let output: any;
    try {
      await Common.updateTaskStatusAsync({
        ...taskAddress,
        status: 'running',
      });
      const functionSummary = await getFunctionTags(ctx);
      output = await executeFunction(ctx, functionSummary, true);
      try {
        await Common.updateTaskStatusAsync({
          ...taskAddress,
          status: 'completed',
          output,
        });
      } catch (e1) {
        console.log('ERROR UPDATING TASK STATUS AFTER TASK COMPLETION', taskAddress, e1);
        try {
          await Common.updateTaskStatusAsync({
            ...taskAddress,
            status: 'error',
            error: {
              statusCode: 500,
              message: (e1 as any).stack || (e1 as any).message || e1,
            },
          });
        } catch (e2) {
          console.log('ERROR TRANSITIONING TO FAILED STATE AFTER TASK STATUS UPDATE ERROR', taskAddress, e1, e2);
          // do nothing
        }
      }
      result.success.push({ type: 'task', key, logs: ctx.logs ? 'enabled' : 'disabled' });
    } catch (e) {
      try {
        await Common.updateTaskStatusAsync({
          ...taskAddress,
          status: 'error',
          error: {
            statusCode: 500,
            message: (e as any).stack || (e as any).message || e,
          },
        });
      } catch (e3) {
        console.log('ERROR TRANSITIONING TO FAILED STATE AFTER TASK ERROR', taskAddress, e, e3);
        // do nothing
      }
      result.failure.push({
        type: 'task',
        key,
        error: `${(e as any).stack || e}`,
      });
    }
  };

  await Constants.asyncPool(concurrentExecutionLimit, event.Records, async (msg: any) => {
    const ctx = JSON.parse(msg.body);
    if (ctx.type === 'task') {
      await runTask(ctx);
    } else if (ctx.type === 'delayed-task') {
      await rescheduleTask(ctx);
    } else {
      await processCron(ctx);
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

async function executeFunction(
  ctx: any,
  functionSummary: any,
  isTask?: boolean
): Promise<{ response: any; meta: any }> {
  // Add any necessary security tokens to the request.
  await addSecurityTokens(ctx, functionSummary, isTask);

  ctx.version = Constants.getFunctionVersion(functionSummary);

  const { startTime, deviation } = isTask
    ? calculateTaskDeviation(ctx)
    : calculateCronDeviation(ctx.cron, ctx.timezone);

  const traceId = Constants.makeTraceId();
  const spanId = Constants.makeTraceSpanId();

  // Generate a pseudo-request object to drive the invocation.
  let request: any = isTask
    ? {
        method: 'TASK',
        body: ctx.body,
        url: ctx.url,
        headers: ctx.headers,
        query: ctx.query,
        params: {
          ...ctx,
          functionPath: ctx.path,
        },
      }
    : {
        method: 'CRON',
        body: ctx,
        url: `${Constants.get_function_path(ctx.subscriptionId, ctx.boundaryId, ctx.functionId)}`,
        originalUrl: `/v1${Constants.get_function_path(ctx.subscriptionId, ctx.boundaryId, ctx.functionId)}`,
        protocol: 'cron',
        query: {},
        params: {
          ...ctx,
          path: '/',
        },
      };
  request = {
    ...request,
    headers: {
      ...request.headers,
      [Constants.traceIdHeader]: `${traceId}.${spanId}`,
    },
    traceId,
    requestId: `${traceId}.${spanId}`,
    spanId,
    startTime,
    functionSummary,
  };

  if (!isTask) {
    request.params.baseUrl = Constants.get_function_location(
      { headers: { 'x-forwarded-proto': 'https', host: Constants.API_PUBLIC_ENDPOINT.replace(/http[s]?:\/\//i, '') } },
      ctx.subscriptionId,
      ctx.boundaryId,
      ctx.functionId
    );
  }

  // Execute, and record the results.
  return new Promise((resolve, reject) =>
    Common.invoke_function(request, (error: any, response: any, meta: any) => {
      if (isTask) {
        meta.metrics.task = { deviation };
      } else {
        meta.metrics.cron = { deviation };
      }
      dispatchEvent({
        isTask,
        request,
        error,
        response,
        meta,
        persistLogs: !!functionSummary?.['compute.persistLogs'],
      });

      if (error) {
        reject(error);
      } else {
        resolve({ response, meta });
      }
    })
  );
}

// Add tokens for both RunAs permissions as well as any logging permissions that are needed.
async function addSecurityTokens(ctx: any, functionSummary: any, isTask?: boolean) {
  // Check if there is route-specific permission override
  let functionPermissions: any;
  const path = isTask && ctx.headers['fusebit-task-route'];
  if (path) {
    if (functionSummary.routes) {
      const route = getExactRoute(functionSummary.routes, path);
      functionPermissions = route?.security?.functionPermissions;
    }
  } else {
    functionPermissions = Constants.getFunctionPermissions(functionSummary);
  }

  // Mint a JWT, if necessary, and add it to the context.
  ctx.functionAccessToken = await mintJwtForPermissions(
    keyStore,
    ctx,
    functionPermissions,
    (ctx.method || 'cron').toLowerCase()
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

function calculateTaskDeviation(ctx: any) {
  const startTime = Date.now();
  const deviation =
    startTime -
    (!isNaN(ctx.headers[Constants.NotBeforeHeader]) ? +ctx.headers[Constants.NotBeforeHeader] * 1000 : startTime);

  return { startTime, deviation };
}

function dispatchEvent(details: any) {
  const params = details.isTask ? details.request : details.request.params;
  const fusebit = {
    accountId: params.accountId,
    subscriptionId: params.subscriptionId,
    boundaryId: params.boundaryId,
    functionId: params.functionId,
    deploymentKey: process.env.DEPLOYMENT_KEY,
    mode: details.isTask ? 'task' : 'cron',
    modality: 'execution',
  };

  const apiVersion = fusebit.boundaryId === 'connector' || fusebit.boundaryId === 'integration' ? 'v2' : 'v1';

  const url =
    apiVersion === 'v1'
      ? details.request.url
      : `/${apiVersion}/account/${fusebit.accountId}/subscription/${fusebit.subscriptionId}/${fusebit.boundaryId}/${fusebit.functionId}/cron/event`;

  const baseUrl =
    apiVersion === 'v1'
      ? details.request.url
      : `/${apiVersion}/account/${fusebit.accountId}/subscription/${fusebit.subscriptionId}/${fusebit.boundaryId}/${fusebit.functionId}`;

  const statusCode = details.error ? details.error.statusCode || 501 : details.response?.status || 200;

  const event = {
    requestId: details.request.requestId,
    traceId: details.request.traceId,
    spanId: details.request.spanId,
    startTime: details.request.startTime,
    endTime: Date.now(),
    request: {
      method: details.request.method,
      url,
      params: { ...details.request.params, baseUrl },
      headers: details.request.headers,
    },
    metrics: details.meta.metrics,
    response: { statusCode, headers: details.response?.headers || [] },
    ...(details.persistLogs && details.meta.log ? { logs: details.meta.log } : {}),
    fusebit: {
      ...fusebit,
      baseUrl,
      apiVersion,
    },
    error: details.meta.error || details.error, // The meta error always has more information.
    functionLogs: details.response?.logs || [],
    functionSpans: details.response?.spans || [],
  };

  Common.dispatch_event(event);
}
