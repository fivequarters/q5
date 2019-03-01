import * as AWS from 'aws-sdk';
import * as Async from 'async';
import * as Crypto from 'crypto';
import * as Jwt from 'jsonwebtoken';

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
});
const lambda = new AWS.Lambda({
  apiVersion: '2015-03-31',
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
      if (!exists) {
        result.skipped.push(msg);
        return cb();
      }

      let options: any = {
        body,
        headers: {},
        query: {},
        method: 'CRON',
      };

      if (process.env.LOGS_WS_URL) {
        options.logs = {
          token: Jwt.sign(
            { boundary: body.boundary, name: body.name },
            <string>process.env.LOGS_WS_TOKEN_SIGNATURE_KEY,
            {
              expiresIn: +(<string>process.env.LOGS_WS_TOKEN_EXPIRY) || 30,
            }
          ),
          url: process.env.LOGS_WS_URL,
        };
      }

      return lambda.invokeAsync(
        {
          FunctionName: get_user_function_name(body),
          InvokeArgs: JSON.stringify(options),
        },
        e => {
          if (e) {
            result.failure.push(msg);
          } else {
            result.success.push(msg);
          }
          return cb();
        }
      );
    }
  }
}

function get_user_function_description(options: any) {
  return `function:${options.boundary}:${options.name}`;
}

function get_user_function_name(options: any): string {
  return Crypto.createHash('sha1')
    .update(get_user_function_description(options))
    .digest('hex');
}
