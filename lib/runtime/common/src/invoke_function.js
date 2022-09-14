const superagent = require('superagent');
const create_error = require('http-errors');

const Constants = require('@5qtrs/constants');
const BqMetering = require('@5qtrs/bq-metering');
const {
  isTaskSchedulingRequest,
  getTaskConfig,
  scheduleTaskAsync,
  getTaskStatistics,
  createTaskId,
} = require('./tasks');

const Common = require('./common');

exports.invoke_function = (req, next) => {
  const options = {
    accountId: req.params.accountId,
    subscriptionId: req.params.subscriptionId,
    boundaryId: req.params.boundaryId,
    functionId: req.params.functionId,
    baseUrl: req.params.baseUrl,
    path: req.params.functionPath,
    logs: req.params.logs,
    method: req.method,
    url: req.url,
    body: req.body || {},
    headers: req.headers,
    query: req.query,
    fusebit: { functionAccessToken: req.params.functionAccessToken, endpoint: Constants.get_fusebit_endpoint(req) },
    caller: {},
  };

  if (req.resolvedAgent) {
    options.caller.permissions = req.resolvedAgent.agent.access;
    options.fusebit.callerAccessToken = req.headers.authorization.replace(/^bearer\s+/i, '');
  }
  const cb = (e, r) => invoke_function_handler(req, next, e, r);

  if (req.functionSummary['ephemeral.redirect'] && !isTaskSchedulingRequest(req)) {
    const redirectUrl = req.functionSummary['ephemeral.redirect'];
    const url = `${redirectUrl}/v1${req.url}`;
    const hostname = redirectUrl.replace('https://', '');
    const timeout = req.functionSummary['compute.timeout'] * 1000;
    return invoke_function_http(options, url, hostname, timeout, cb);
  }

  return isTaskSchedulingRequest(req)
    ? schedule_function_core(req, { ...options, functionVersion: req.params.version }, cb)
    : invoke_function_core(options, req.params.version, cb);
};

const invoke_function_http = async (options, redirectUrl, redirectHostname, timeout, cb) => {
  // Get the url

  let err, result;
  const startTime = Date.now();
  try {
    // Dispatch the function
    result = await superagent('POST', redirectUrl)
      .retry(0)
      // Add various limits
      .timeout({ deadline: timeout })
      .maxResponseSize(5 * 1024 * 1024)
      // Turn off following redirects
      .redirects(0)
      // Buffer the response so the whole thing can be sent back at once
      .buffer()
      // Treat all responses as success.
      .ok(() => true)
      // Set the headers
      .set({ host: redirectHostname })
      // Send the body and the request
      .send(options);
  } catch (e) {
    err = {
      mode: 'redirect',
      code: 'ResourceNotFoundException',
      message: `Failed to complete request to ${redirectUrl}: ${e.code}`,
    };
    return cb(err, null);
  }

  const endTime = Date.now();

  // Expected responses only include 200 status code with everything else communicated in the body; if the
  // surrounding envelope isn't 200, promote it downwards into the body.
  if (result.status !== 200) {
    err = {
      mode: 'redirect',
      code: 'ResourceNotFoundException',
      message: `Failed to perform request, response: ${result.status}`,
      error: result.body,
    };
    return cb(err, null);
  }

  const data = {
    StatusCode: result.status,
    Payload: result.body,
    Metrics: { redirect: { duration: endTime - startTime } },
  };

  return cb(null, data);
};

const invoke_function_core = (options, version, cb) => {
  let invoke_params = {
    FunctionName: Constants.get_user_function_name(options, version),
    Payload: JSON.stringify(options),
    InvocationType: 'RequestResponse',
    LogType: 'Tail',
  };
  const req = Common.Lambda.invoke(invoke_params, (e, d) => {
    if (d && d.Payload) {
      try {
        d.Payload = JSON.parse(d.Payload);
      } catch (e) {
        e.mode = 'lambda';
        return cb(e);
      }
    }
    return cb(e, d);
  });
  if (req.httpRequest.stream) {
    // To enable long tunning tasks, set TCP keep alive to work around the 350s
    // limit on inactive TCP connections on AWS NAT
    // (see https://github.com/aws/aws-sdk-js-v3/issues/3624)
    req.httpRequest.stream.setSocketKeepAlive(true, 10000);
  }
};

const schedule_function_core = async (req, ctx, cb) => {
  const taskConfiguration = getTaskConfig(req);
  let result;
  let isDone = false;
  const done = (error, result) => {
    if (isDone) return;
    isDone = true;
    cb(error, result);
  };
  try {
    if (taskConfiguration.maxPending > 0) {
      // Enforce maxPending limit by pushing back with HTTP 429
      const taskStatistics = await getTaskStatistics(taskConfiguration);
      if (taskConfiguration.maxPending < taskStatistics.pendingCount) {
        return done({
          code: 'TooManyPendingTasks',
        });
      }
    }
    const task = {
      taskId: createTaskId(),
      scheduledAt: Date.now(),
      matchingRoutePath: req.params.matchingRoute.path,
      ctx,
    };
    const d = await scheduleTaskAsync(taskConfiguration, task);
    const location = `${Constants.get_function_management_endpoint(
      req,
      ctx.accountId,
      ctx.subscriptionId,
      ctx.boundaryId,
      ctx.functionId
    )}/task/${d.taskId}`;
    result = {
      StatusCode: 202,
      Payload: {
        status: 202,
        headers: {
          location,
        },
        body: { ...d, location },
      },
    };
  } catch (e) {
    return done(e);
  }
  done(null, result);
};

const invoke_function_handler = (req, next, e, r) => {
  BqMetering.countExecution({
    deploymentId: process.env.DEPLOYMENT_KEY || 'localhost',
    subscriptionId: req.params.subscriptionId,
    boundaryId: req.params.boundaryId,
    functionId: req.params.functionId,
  });

  let meta = { source: 'proxy', error: e, log: [], metrics: (r && r.Metrics) || {} };

  if (e) {
    if (e.mode !== 'redirect') {
      print_error(req.params, e);
    }
    if (e.code === 'ResourceNotFoundException') {
      return next(create_error(404), null, meta);
    } else if (e.code === 'TooManyRequestsException') {
      return next(create_error(503), null, meta);
    } else if (e.code === 'TooLargeDelayException') {
      return next(create_error(400, e.message), null, meta);
    } else if (e.code === 'TooManyPendingTasks') {
      return next(create_error(429), null, meta);
    } else {
      return next(create_error(500), null, meta);
    }
  }

  // Process logs and propagate back to the caller
  if (r.LogResult) {
    const persistLogs = !!req.functionSummary['compute.persistLogs'];
    meta = { ...meta, ...parse_lambda_logs(r.LogResult, persistLogs) };
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
    // Return a 522 instead of 500. CloudFlare uses the error code to indicate a connection timeout on the origin webserver
    // As much as it sucks to use a string include based time out detection
    // AWS does not set a proper errorType for backend timeouts
    if (meta.error.errorMessage.includes('timed out')) {
      return next(create_error(522), r.Payload, meta);
    }
    return next(create_error(500), r.Payload, meta);
  }

  meta.source = 'function';

  return next(null, r.Payload, meta);
};

// Parse the report AWS includes in LogResult from a Lambda invocation, extracting out
// a few useful facts and storing the messages
const parse_lambda_logs = (logResult, persistLogs) => {
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
    } else if (!Common.realtime_logs_enabled || persistLogs) {
      // Strip out the AWS pre-amble, and log when realtime logs are disabled or
      // persistent logs are enabled for a function.
      let s = line.match(/^[^\s]+\t[^\s]+\t+(?:INFO|ERROR)\t+(.+)/);
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
