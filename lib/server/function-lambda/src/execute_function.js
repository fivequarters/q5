const Assert = require('assert');
const Common = require('./common');
const create_error = require('http-errors');
const Jwt = require('jsonwebtoken');
const BqMetering = require('@5qtrs/bq-metering');

const realTimeLogsEnabled = !process.env.LOGS_DISABLE;

module.exports = function lambda_execute_function(req, res, next) {
  return module.exports.core(
    {
      subscriptionId: req.params.subscriptionId,
      boundaryId: req.params.boundaryId,
      functionId: req.params.functionId,
      method: req.method,
      url: req.url,
      body: req.body || {},
      headers: req.headers,
      query: req.query,
    },
    (e, r) => {
      if (e) {
        res.set('x-fx-response-source', 'proxy');
        if (e.code === 'ResourceNotFoundException') {
          return next(create_error(404));
        } else if (e.code === 'TooManyRequestsException') {
          console.log(
            `ERROR: Lambda concurrency limit exceeded when running function ${req.params.subscriptionId}/${
              req.params.boundaryId
            }/${req.params.functionId}`
          );
          return next(create_error(503));
        } else {
          console.log(
            `ERROR: error executing Lambda function ${req.params.subscriptionId}/${req.params.boundaryId}/${
              req.params.functionId
            }: ${e.code} ${e.message}`
          );
          return next(
            create_error(
              500,
              `Error executing function ${req.params.subscriptionId}/${req.params.boundaryId}/${req.params.functionId}`
            )
          );
        }
      }

      BqMetering.countExecution({
        deploymentId: process.env.DEPLOYMENT_KEY || 'localhost',
        subscriptionId: req.params.subscriptionId,
        boundaryId: req.params.boundaryId,
        functionId: req.params.functionId,
      });

      // Process logs and propagate back to the caller
      if (r.LogResult && (req.query['x-fx-logs'] !== undefined || req.headers['x-fx-logs'] !== undefined)) {
        let lambdaLogs = Buffer.from(r.LogResult, 'base64')
          .toString('utf8')
          .split('\n');
        let stdout = [];
        let duration;
        let memory;
        lambdaLogs.forEach(line => {
          if (line.match(/^START/)) return;
          if (line.match(/^END/)) return;
          if (line.match(/^REPORT/)) {
            let report = line.match(/Duration\:\s*(\d*\.\d*)/);
            duration = report && report[1];
            report = line.match(/Max Memory Used\:\s*(\d+)/);
            memory = report && report[1];
          } else if (!realTimeLogsEnabled) {
            let s = line.match(/^[^\s]+\t[^\s]+\t+(.+)/);
            if (s && s[1]) {
              stdout.push(s[1]);
            } else {
              stdout.push(line);
            }
          }
        });
        stdout.push(`Last execution took ${duration || 'N/A'} ms and used ${memory || 'N/A'} MB of memory.`);
        res.set('x-fx-logs', Buffer.from(stdout.join('\n')).toString('base64'));
      }

      if (r.FunctionError) {
        res.set('x-fx-response-source', 'provider');
        res.status(500);
        return res.json({
          status: 500,
          statusCode: 500,
          message: r.Payload.errorMessage || r.Payload.message,
          properties: r.Payload,
        });
      }
      res.set('x-fx-response-source', 'function');
      if (r.Payload) {
        res.status(r.Payload.status || 200);
        if (r.Payload.headers) {
          Assert.equal(typeof r.Payload.headers, 'object', 'Lambda payload.headers is an object');
          for (var h in r.Payload.headers) {
            Assert.equal(typeof r.Payload.headers[h], 'string', `Lambda payload.headers[${h}] must be a string`);
            res.set(h, r.Payload.headers[h]);
          }
        }
        if (r.Payload.body) {
          if (r.Payload.rawBody) {
            res.send(r.Payload.body);
          } else {
            res.json(r.Payload.body);
          }
        } else {
          res.end();
        }
      } else {
        res.status(200);
        res.end();
      }
    }
  );
};

module.exports.core = function lambda_execute_function_core(options, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscriptionId must be specified');
  Assert.equal(typeof options.boundaryId, 'string', 'options.boundaryId must be specified');
  Assert.ok(options.boundaryId.match(Common.valid_boundary_name), 'boundary name must be valid');
  Assert.equal(typeof options.functionId, 'string', 'options.functionId must be specified');
  Assert.ok(options.functionId.match(Common.valid_function_name), 'function name must be valid');
  Assert.ok(options.method, 'query must be specified');
  Assert.ok(options.body, 'body must be specified');
  Assert.ok(options.headers, 'headers must be specified');
  Assert.ok(options.query, 'query must be specified');
  Assert.ok(options.url, 'url must be specified');

  const host = process.env.LOGS_HOST || options.headers.host;
  const protocol = options.headers['x-forwarded-proto'] ? options.headers['x-forwarded-proto'].split(',')[0] : 'https';

  // Create a token to allow the Lambda function to authorize to websocket endpoint
  if (realTimeLogsEnabled && (options.query['x-fx-logs'] !== undefined || options.headers['x-fx-logs'] !== undefined)) {
    options.logs = {
      token: Jwt.sign(
        { subscriptionId: options.subscriptionId, boundaryId: options.boundaryId, functionId: options.functionId },
        process.env.LOGS_TOKEN_SIGNATURE_KEY,
        {
          expiresIn: +process.env.LOGS_TOKEN_EXPIRY || 15 * 60,
        }
      ),
      path: '/v1/internal/logs',
      host,
      protocol,
    };
  }

  let invoke_params = {
    FunctionName: Common.get_user_function_name(options),
    Payload: JSON.stringify(options),
    InvocationType: 'RequestResponse',
    LogType: 'Tail',
  };

  return Common.Lambda.invoke(invoke_params, (e, d) => {
    if (d) {
      try {
        if (d.Payload) {
          d.Payload = JSON.parse(d.Payload);
        }
      } catch (e) {
        return cb(e);
      }
    }
    return cb(e, d);
  });
};
