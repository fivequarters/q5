import * as AWS from 'aws-sdk';
import * as Async from 'async';
import * as Cron from 'cron-parser';
import * as Crypto from 'crypto';
import * as Jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const Lambda = require('./function-lambda');

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

      let options: any = {
        body,
        headers: {},
        query: {},
        method: 'cron',
      };

      if (process.env.LOGS_WS_URL) {
        options.logs = {
          token: Jwt.sign(
            { subscriptionId: body.subscriptionId, boundaryId: body.boundaryId, functionId: body.functionId },
            <string>process.env.LOGS_WS_TOKEN_SIGNATURE_KEY,
            {
              expiresIn: +(<string>process.env.LOGS_WS_TOKEN_EXPIRY) || 30,
            }
          ),
          url: process.env.LOGS_WS_URL,
        };
      }

      let startTime = Date.now();
      let deviation = startTime - Date.parse(Cron.parseExpression(request.params.cron, {
        currentDate: new Date(startTime),
        iterator: true
      }).prev().toString());

      let req = {
        method: 'cron',
        url: get_user_function_url(options.body),
        body: options,
        headers: {},
        query: {},
        params: body,
      };

      let res: any;

      let handler = (e: any) => {
        logCronResult({ options: options, error: e, response: res, startTime: startTime, deviation: deviation });
        if (e) {
          result.failure.push(msg);
        } else {
          result.success.push(msg);
        }
        return cb();
      };

      res = new class {
        headers: any = {};
        statusCode: number = 0;
        set(hdr: string, val: string) { this.headers[hdr] = val; }
        status(code: number) { this.statusCode = code; }
        json(result: any) { Object.assign(this, result); handler(null); }
        end(body: any, bodyEncoding: string) { handler(null); }
      };

      return Lambda.execute_function(req, res, handler);
    }
  }
}

function logCronResult(details: any) {
  const request = {
    method: 'CRON',
    url: get_user_function_url(details.options.body),
    path: details.FunctionName,
    params: details.options.body,
    protocol: 'cron',
    query: {}
  };

  const event = {
    mode: 'cron',
    requestId: uuidv4(),
    startTime: details.startTime,
    endTime: Date.now(),
    request: request,
    metrics: { cron: { deviation: details.deviation } },
    error: {},
    statusCode: 0,
  };

  if (details.error) {
    if (details.error.code === 'ResourceNotFoundException') {
      event.statusCode = 404;
    } else if (details.error.code === 'TooManyRequestsException') {
      event.statusCode = 503;
    } else {
      event.statusCode = 500;
    }
    event.error = { errorType: 'Error', errorMessage: details.error.code };
  } else {
    event.statusCode = 200;
    delete event.error;
  }

  Lambda.dispatch_event(event);
}


function get_user_function_url(options: any) {
  return `/run/${options.subscriptionId}/${options.boundaryId}/${options.functionId}`;
}

function get_user_function_description(options: any) {
  return `function:${options.subscriptionId}:${options.boundaryId}:${options.functionId}`;
}

function get_user_function_name(options: any): string {
  return Crypto.createHash('sha1')
    .update(get_user_function_description(options))
    .digest('hex');
}
