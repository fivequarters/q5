import * as AWS from 'aws-sdk';
import * as Async from 'async';
import * as Cron from 'cron-parser';
import * as Crypto from 'crypto';
import * as Jwt from 'jsonwebtoken';
import * as Runtime from '@5qtrs/runtime-common';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
});

const concurrentExecutionLimit = +(<string>process.env.CRON_CONCURRENT_EXECUTION_LIMIT) || 5;

export function executor(event: any, context: any, cb: any) {
  let result: any = {
    success: [],
    failure: [],
    skipped: [],
  };

  return Async.eachLimit(
    event.Records,
    concurrentExecutionLimit,
    (msg, cb) => maybeExecuteCronJob(msg, cb),
    e => cb(e, result)
  );

  function maybeExecuteCronJob(msg: any, cb: any) {
    let body = JSON.parse(msg.body);
    return Async.waterfall(
      [(cb: any) => checkCronStillExists(cb), (exists: boolean, cb: any) => runIfExists(exists, cb)],
      cb
    );

    function checkCronStillExists(cb: any) {
      s3.headObject(
        {
          Bucket: <string>process.env.AWS_S3_BUCKET,
          Key: body.key,
        },
        (e, d) => cb(null, !!(!e && d))
      );
    }

    function runIfExists(exists: boolean, cb: any) {
      console.log(exists ? 'RUNNING CRON JOB' : 'SKIPPING CRON JOB', msg);
      if (!exists) {
        result.skipped.push(msg);
        return cb();
      }

      // Calculate the deviation from the actual expected time to now.
      let startTime = Date.now();
      let deviation = startTime - Date.parse(Cron.parseExpression(body.cron, {
        currentDate: startTime,
        tz: body.timezone,
      }).prev().toString());

      // Generate a pseudo-request object to drive the invocation.
      let request = {
        method: 'CRON',
        url: '',
        path: Runtime.Common.get_user_function_name(body),
        body: body,
        protocol: 'cron',
        headers: { 'x-forwarded-proto': 'cron', host: 'fusebit'},
        query: {},
        params: body,
        requestId: uuidv4(),
        startTime,
      };

      request.url = Runtime.Common.get_function_location(request, request.params.subscriptionId,
        request.params.boundaryId, request.params.functionId);

      Runtime.create_logging_token(request);

      // Execute, and record the results.
      return Runtime.invoke_function(request, (error: any, response: any, meta: any) => {
        meta.metrics.cron = { deviation };
        dispatch_cron_event({ request, error, response, meta });

        if (error) {
          result.failure.push(msg);
        } else {
          result.success.push(msg);
        }

        return cb();
      });
    }
  }
}

function dispatch_cron_event(details: any) {
  const event = {
    requestId: details.request.requestId,
    startTime: details.request.startTime,
    endTime: Date.now(),
    request: details.request,
    metrics: details.meta.metrics,
    response: { statusCode: details.response.statusCode, headers: details.response.headers },
    error: details.meta.error || details.error,   // The meta error always has more information.
  };

  Runtime.dispatch_event(event);
}
