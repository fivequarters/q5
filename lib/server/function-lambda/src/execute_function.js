const Assert = require('assert');
const Common = require('./common');
const create_error = require('http-errors');
const Jwt = require('jsonwebtoken');
const BqMetering = require('@5qtrs/bq-metering');
const ConnectionCache = require('./log_connection_cache');

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

      try {
        // Process logs and propagate back to the caller
        if (r.LogResult) {
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
          if (typeof r.Payload.headers === 'object') {
            for (var h in r.Payload.headers) {
              res.set(h, r.Payload.headers[h]);
            }
          }
          if (r.Payload.body) {
            if (r.Payload.bodyEncoding && typeof r.Payload.body === 'string') {
              res.end(r.Payload.body, r.Payload.bodyEncoding);
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
      } catch (e) {
        console.log(
          `ERROR: error processing response from Lambda function ${req.params.subscriptionId}/${
          req.params.boundaryId
          }/${req.params.functionId}: ${e.code} ${e.message}`
        );
        return next(
          create_error(
            500,
            `Error processing response from function ${req.params.subscriptionId}/${req.params.boundaryId}/${
            req.params.functionId
            }: ${e.message}`
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
  Assert.ok(options.url, 'url must be specified');

  const host = process.env.LOGS_HOST || options.headers.host;
  const protocol = options.headers['x-forwarded-proto'] ? options.headers['x-forwarded-proto'].split(',')[0] : 'https';

  // Create a token to allow the Lambda function to authorize to websocket endpoint
  if (realTimeLogsEnabled && ConnectionCache.is_logging_enabled(options)) {
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

  let trace = invocationTraceStart({
    method: invoke_params.FunctionName,
    payload: options,
    mode: invoke_params.InvocationType,
    logType: invoke_params.LogType
  });

  return Common.Lambda.invoke(invoke_params, (e, d) => {
    invocationLog(trace, e, d);
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

/*
const AWS = require("aws-sdk");
const uuidv4 = require('uuid/v4')

const cwl = new AWS.CloudWatchLogs({apiVersion: '2014-03-28'});
// Should be scoped by the deployment name to avoid namespacing issues.
const logGroupName = "tracing_for_this_deployment";
const logStreamName = uuidv4();
var nextSequenceToken = undefined;

// Accept a ResourceAlreadyExistsException, but fail on others.
cwl.createLogGroup({logGroupName: logGroupName}).send((err, data) => {
  if (err != null && err.code != 'ResourceAlreadyExistsException') {
    throw err;
  }
  console.log("LogGroup Successfully Created");
});

// On the other hand, don't accept a ResourceAlreadyExistsException here.
cwl.createLogStream({logGroupName: logGroupName, logStreamName: logStreamName}).send((err, data) => {
  if (err != null) {
    throw err;
  }
  console.log("LogStream Successfully Created");
});

function writeToLogStream(logEvents) {
  // Warning: 50 TPS limit, institute buffering before going to production.
  let events = {
    logEvents: logEvents,
    logGroupName: logGroupName,
    logStreamName: logStreamName,
    sequenceToken: nextSequenceToken
  };

  cwl.putLogEvents(events, (err, data) => {
    console.log(err, data);
    if (data != null) {
      nextSequenceToken = data.nextSequenceToken;
    }
  });
}
*/
var LSClient = require('logstash-client');
var logstash = new LSClient({
  type: 'tcp',
  host: 'localhost',
  port: 5000
});

function writeToLogStream(logEvent) {
  let event = { ...logEvent, '@timestamp': logEvent.end};
  logstash.send(event);
}

function invocationTraceStart(params) {
  // Remove the logs keys, which are largely irrelevant
  delete params.payload.logs;
  return { start: new Date(Date.now()), ...params };
}

function invocationLog(trace, e, d) {
  // Extract out the tailing log, and get the last REPORT RequestId from the log.
  let log = Buffer.from(d.LogResult, 'base64').toString('ascii').split('\n').filter((e) => { return e != null && e.length > 0});
  let requestId = log.pop().match('REPORT RequestId: ([^\t]*)\t')[1];

  // Collect the remaining fields.
  let now = Date.now()
  trace.end = new Date(now);
  trace.duration = trace.end - trace.start;
  trace.requestId = requestId;
  trace.result = { error: e, data: d};

  writeToLogStream(trace);
  console.log(JSON.stringify(trace, null, 2));
}