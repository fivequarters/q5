const Assert = require('assert');
const Common = require('./common');
const Constants = require('@5qtrs/constants');
const create_error = require('http-errors');
const BqMetering = require('@5qtrs/bq-metering');

exports.invoke_function = (req, next) => {
  const options = {
    accountId: req.params.accountId,
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
    fusebit: { functionAccessToken: req.params.functionAccessToken, endpoint: Constants.get_fusebit_endpoint(req) },
    caller: {},
  };

  // req.url, req.originalUrl, and req.params.baseUrl are supplied by the caller.
  options.path =
    require('url').parse(
      req.originalUrl.substring(
        `/v1${Constants.get_function_path(options.subscriptionId, options.boundaryId, options.functionId)}`.length
      )
    ).pathname || '/';

  if (req.resolvedAgent) {
    options.caller.permissions = req.resolvedAgent.agent.access;
    options.fusebit.callerAccessToken = req.headers.authorization.replace(/^bearer /i, '');
  }

  return invoke_function_core(options, req.params.version, (e, r) => invoke_function_handler(req, next, e, r));
};

const invoke_function_core = (options, version, cb) => {
  let invoke_params = {
    FunctionName: Constants.get_user_function_name(options, version),
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
    // AWS misnames the stack as 'trace', change to be consistent.
    //
    // Async errors may slip through here, as AWS just reports them as FunctionError: 'Unhandled' with a
    // StatusCode: 200.  The LogResult contains information to debug, but is not parsed nor contained here.
    const msg = r.Payload.errorMessage || r.Payload.message;
    meta.source = 'provider';
    meta.error = {
      errorType: r.Payload.errorType,
      errorMessage: msg,
      stack: r.Payload.trace && r.Payload.trace.join('\n'),
    };
    return next(create_error(500), r.Payload, meta);
  }

  meta.source = 'function';

  return next(null, r.Payload, meta);
};

// Parse the report AWS includes in LogResult from a Lambda invocation, extracting out
// a few useful facts and storing the messages
const parse_lambda_logs = (logResult) => {
  let lambdaLogs = Buffer.from(logResult, 'base64').toString('utf8').split('\n');

  let log = [];
  let duration;
  let memory;

  lambdaLogs.forEach((line) => {
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
  // When an error occurs during lambda execution.
  console.log(
    `INVOKE ERROR: ${p.subscriptionId}/${p.boundaryId}/${p.functionId}: ${e.code} ${e.message} stacktrace: ${
      process.stdout.isTTY ? e.stack : e.stack.split('\n').join(', ')
    }`
  );
};
