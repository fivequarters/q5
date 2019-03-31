const Assert = require('assert');
const Common = require('./common');
const create_error = require('http-errors');
const Jwt = require('jsonwebtoken');
const Logger = require('./logger');

const realTimeLogsEnabled = !!process.env.LOGS_WS_URL;

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
        } else {
          return next(create_error(500, `Error getting function: ${e.message}.`));
        }
      }

      res.set('x-fx-response-source', 'provider');
      if (r.FunctionError) {
        res.status(500);
        return res.json({ error: r.Payload });
      }
      if (r.Payload) {
        // Assert.equal(typeof r.Payload, 'object', 'Lambda response payload is an object');
        res.status(r.Payload.status || 200);
        if (r.Payload.headers) {
          Assert.equal(typeof r.Payload.headers, 'object', 'Lambda payload.headers is an object');
          for (var h in r.Payload.headers) {
            Assert.equal(typeof r.Payload.headers[h], 'string', `Lambda payload.headers[${h}] must be a string`);
            res.set(h, r.Payload.headers[h]);
          }
        }
        r.Payload.body ? res.json(r.Payload.body) : res.end();
      } else {
        res.status(200);
        res.end();
      }

      // Asynchronously process Lambda logs and send them to pubsub
      if (r.LogResult) {
        let lambdaLogs = new Buffer(r.LogResult, 'base64').toString('utf8').split('\n');
        let stdout = [];
        let duration;
        let memory;
        // console.log('LOGS', lambdaLogs);
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
        stdout.forEach(msg =>
          Logger.info(
            {
              topics: [
                `logs:application:${req.params.subscriptionId}:${req.params.boundaryId}:${req.params.functionId}:`,
              ],
            },
            msg
          )
        );
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
  Assert.ok(options.url, 'query must be specified');

  // Create a token to allow the Lambda function to authorize to websocket endpoint
  if (
    realTimeLogsEnabled &&
    (!options.query || options.query['flexd-no-logs'] === undefined) &&
    (!options.headers || options.headers['x-flexd-no-logs'] === undefined)
  ) {
    options.logs = {
      token: Jwt.sign(
        { subscriptionId: options.subscriptionId, boundaryId: options.boundaryId, functionId: options.functionId },
        process.env.LOGS_WS_TOKEN_SIGNATURE_KEY,
        {
          expiresIn: +process.env.LOGS_WS_TOKEN_EXPIRY || 30,
        }
      ),
      url: process.env.LOGS_WS_URL,
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
        // if (d.LogResult) {
        //     d.LogResult = new Buffer(d.LogResult, 'base64').toString('utf8');
        // }
      } catch (e) {
        return cb(e);
      }
    }
    return cb(e, d);
  });
};
