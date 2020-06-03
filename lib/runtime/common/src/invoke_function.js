const Assert = require('assert');
const Common = require('./common');
const create_error = require('http-errors');
const BqMetering = require('@5qtrs/bq-metering');

exports.invoke_function = (req, next) => {
  const options = {
    subscriptionId: req.params.subscriptionId,
    boundaryId: req.params.boundaryId,
    functionId: req.params.functionId,
    baseUrl: req.params.baseUrl,
    logs: req.params.logs,
    method: req.method,
    url: req.url,
    body: req.body || {},
    headers: req.headers,
    query: req.query,
  };

  return invoke_function_core(options, (e, r) => invoke_function_handler(req, next, e, r));
};

const invoke_function_core = (options, cb) => {
  let invoke_params = {
    FunctionName: Common.get_user_function_name(options),
    Payload: JSON.stringify(options),
    InvocationType: 'RequestResponse',
    LogType: 'Tail',
  };

  return Common.Lambda.invoke(invoke_params, (e, d) => {
    if (d && d.Payload) {
      try {
        d.Payload = JSON.parse(d.Payload);
      } catch (e) {
        return cb(e);
      }
    }
    return cb(e, d);
  });
};

const invoke_function_handler = (req, next, e, r) => {
  BqMetering.countExecution({
    deploymentId: process.env.DEPLOYMENT_KEY || 'localhost',
    subscriptionId: req.params.subscriptionId,
    boundaryId: req.params.boundaryId,
    functionId: req.params.functionId,
  });

  let meta = { source: 'proxy', error: e, log: [], metrics: {} };

  if (e) {
    print_error(req.params, e);
    if (e.code === 'ResourceNotFoundException') {
      return next(create_error(404), null, meta);
    } else if (e.code === 'TooManyRequestsException') {
      return next(create_error(503), null, meta);
    } else {
      return next(create_error(500), null, meta);
    }
  }

  // Process logs and propagate back to the caller
  if (r.LogResult) {
    meta = { ...meta, ...parse_lambda_logs(r.LogResult) };
  }

  if (r.FunctionError) {
    // AWS misnames the stack as 'trace', change to be consistent
    const msg = r.Payload.errorMessage || r.Payload.message;
    meta.source = 'provider';
    meta.error = {
      errorType: r.Payload.errorType,
      errorMessage: msg,
      stack: r.Payload.trace.join('\n'),
    };
    return next(create_error(500), r.Payload, meta);
  }

  meta.source = 'function';

  return next(null, r.Payload, meta);
};

// Parse the report AWS includes in LogResult from a Lambda invocation, extracting out
// a few useful facts and storing the messages
const parse_lambda_logs = logResult => {
  let lambdaLogs = Buffer.from(logResult, 'base64')
    .toString('utf8')
    .split('\n');

  let log = [];
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
    } else if (!Common.realtime_logs_enabled) {
      // Strip out the AWS pre-amble, and log when realtime logs are disabled.
      let s = line.match(/^[^\s]+\t[^\s]+\t+(.+)/);
      if (s && s[1]) {
        log.push(s[1]);
      } else {
        log.push(line);
      }
    }
  });

  log.push(`Last execution took ${duration || 'N/A'} ms and used ${memory || 'N/A'} MB of memory.`);

  return { log, metrics: { lambda: { duration, memory } } };
};

const print_error = (p, e) => {
  console.log(`ERROR: ${p.subscriptionId}/${p.boundaryId}/${p.functionId}: ${e.code} ${e.message}`);
  console.log(e.stack);
};
