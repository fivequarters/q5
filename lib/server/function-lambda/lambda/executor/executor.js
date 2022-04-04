const Assert = require('assert');
const Util = require('util');
const Http = require('http');
const Https = require('https');

const adoptOverrides = require('./fastSwap');

const maxBuffer = +process.env.Q5_LOGS_MAX_BUFFER || 25;
const bufferInterval = +process.env.Q5_LOGS_BUFFER_INTERVAL || 100;
const traceIdHeader = 'fusebit-trace-id';
const bunyanLevels = { log: 30, error: 50 };

// Traditional DynamoDb backed logging mechanism, dispatched via async https request.
let logs;

// Grafana backed logging mechanism, returned as part of the response payload
let spans = [];
let requestLogs = [];

// Propagate incoming trace id to all outgoing http(s) requests
let traceId;

const cloneHttpOptionsObjects = ['headers'];

const cloneHttpOptions = (options) => {
  const result = {};

  // Make a simple copy of all of the entries
  Object.keys(options).forEach((opt) => (result[opt] = options[opt]));

  // Duplicate the existing entries that are objects that we know about and touch, to avoid contamination back
  // to the caller.
  cloneHttpOptionsObjects.forEach(
    (opt) => (result[opt] = result[opt] ? JSON.parse(JSON.stringify(result[opt])) : result[opt])
  );

  return result;
};

const errorToObj = (error) => ({
  code: 500,
  status: 500,
  statusCode: 500,
  message: error.message,
  properties: {
    errorMessage: error.message,
    errorType: error.name,
    stackTrace: error.stack.split('\n'),
  },
});

[
  [Http, 'http:'],
  [Https, 'https:'],
].forEach((entry) => {
  const [h, hstr] = entry;

  const normalizeOptions = (args) => {
    let options;

    if (typeof args[0] === 'object') {
      options = cloneHttpOptions(args[0]);
    } else if (typeof args[0] === 'string') {
      if (typeof args[1] === 'object') {
        options = cloneHttpOptions(args[1]);
      } else {
        options = {};
      }
      const url = new URL(args[0]);
      options.hostname = url.hostname;
      options.port = url.port;
      options.path = url.pathname;
    } else {
      return {};
    }
    options.protocol = options.protocol || hstr;
    options.method = (options.method || 'get').toUpperCase();

    return options;
  };

  const createSpan = (args) => {
    const options = normalizeOptions(args);
    const { protocol, host, hostname, port, path, method } = options;
    return {
      startTime: Date.now(),
      url: `${protocol || hstr}//${host || hostname}${port ? `:${port}` : ''}${path}`,
      method,
    };
  };

  const addTraceToArgs = (args) => {
    let options;

    // There's three different call signatures to deal with here for http.get and http.request:
    if (typeof args[0] === 'object') {
      //   1. http.get({ ...options... }, (response) => {});
      options = args[0];
    } else if (typeof args[1] === 'object') {
      //   2. http.get('http://fusebit.io', { ...options... }, (response) => {});
      options = args[1];
    } else {
      //   3. http.get('http://fusebit.io', (response) => {});
      options = {};
      args = [args[0], options, ...args.slice(1)];
    }

    // Add the traceIdHeader and the traceId itself
    options.headers = options.headers || {};
    if (traceId) {
      options.headers[traceIdHeader] = traceId;
    }

    return args;
  };

  const enrichSpan = (span, res) => {
    if (!res) {
      return;
    }
    span.statusCode = res.statusCode;
  };

  const closeSpan = (span, error) => {
    if (!span) {
      return undefined;
    }
    span.endTime = Date.now();
    span.error = error && errorToObj(error);
    spans.push(span);
    return undefined;
  };

  const wrapRequest = (oldFunction) => (...args) => {
    args = addTraceToArgs(args);
    let span = createSpan(args);

    return oldFunction
      .apply(null, args)
      .on('response', (res) => {
        enrichSpan(span, res);
      })
      .once('error', (error) => {
        span = closeSpan(span, error);
      })
      .once('close', (res) => {
        span = closeSpan(span);
      });
  };

  // Wrap both 'request' and 'get', which is a specialization of 'request'.
  h.request = wrapRequest(h.request);
  h.get = wrapRequest(h.get);
});

// Wrap Lambda's uncaughtException handler to ensure logs are flushed before terminating the process
var originalUncaughtException = (process.listeners('uncaughtException') || [])[0];
process.removeAllListeners('uncaughtException');
process.on('uncaughtException', (e, a) => {
  sendLogsNow(() => {
    if (originalUncaughtException) {
      originalUncaughtException(e, a);
    } else {
      throw e;
    }
  });
});

exports.execute = async (event, context) => {
  let handler;

  // Is there an override?
  if (event.overrideSpec) {
    const spec = event.overrideSpec;
    delete event.overrideSpec;

    handler = await adoptOverrides(spec);
    event.configuration = spec.configuration;
  } else {
    handler = require('./app/index');
    event.configuration = process.env;
  }

  Assert.equal(typeof handler, 'function', 'The module export must be a function.');

  // Set traceId for current request
  traceId = event.headers[traceIdHeader];

  // Register the logging system
  updateLogs(event);
  requestLogs = [];

  const resultHandler = (result) => {
    result = result || {};
    if (spans.length > 0) {
      result.spans = spans;
    }
    result.logs = requestLogs;
    return result;
  };

  const errorHandler = (error) => {
    writeToLogs(bunyanLevels.error, require('util').inspect(error));

    return { status: 500, body: errorToObj(error), spans, logs: requestLogs };
  };

  try {
    let output;

    // Handle the asynchronous case
    if (handler.constructor.name === 'AsyncFunction') {
      Assert.equal(handler.length, 1, 'The function must take one parameter: async (ctx).');

      output = await handler(event);
    } else {
      // Handle the synchronous case
      Assert.equal(handler.length, 2, 'The function must take two parameters: (ctx, cb).');

      output = await new Promise((resolve, reject) => {
        handler(event, (error, result) => {
          if (error) {
            reject(error);
          }
          resolve(result);
        });
      });
    }
    return resultHandler(output);
  } catch (error) {
    return errorHandler(error);
  } finally {
    await new Promise((resolve) =>
      sendLogsNow(() => {
        traceId = undefined;
        spans = [];
        requestLogs = [];
        resolve();
      })
    );
  }
};

function updateLogs(event) {
  if (event.logs) {
    if (!logs) {
      logs = event.logs;
      logs.buffer = [];
      logs.outstandingRequests = 0;
      logs.pendingCallbacks = [];
      logs.method = event.method;
    } else {
      logs.token = event.logs.token;
      logs.method = event.method;
    }
    hookupConsole(console, 'log');
    hookupConsole(console, 'error');
    hookupConsoleAnnotate(console);
  } else {
    sendLogsNow();
    logs = undefined;
  }
}

function clearLogsTimeout() {
  if (logs && logs.sendTimeout) {
    clearTimeout(logs.sendTimeout);
    logs.sendTimeout = undefined;
  }
}

function sendLogsNow(cb) {
  clearLogsTimeout();
  sendLogs(cb);
}

function sendLogsAfterInterval() {
  if (logs && !logs.sendTimeout) {
    logs.sendTimeout = setTimeout(() => {
      logs.sendTimeout = undefined;
      sendLogs();
    }, bufferInterval);
    logs.sendTimeout.unref();
  }
}

function releasePendingCallbacks(l, error) {
  var cbs = l.pendingCallbacks;
  l.pendingCallbacks = [];
  cbs.forEach((cb) => cb(error));
}

function sendLogs(cb) {
  if (!logs || (logs.outstandingRequests === 0 && logs.buffer.length === 0)) {
    // Logs are disabled or there are no pending async calls and nothing new to send
    return cb ? cb() : undefined;
  } else if (cb) {
    // Register pending callback
    logs.pendingCallbacks.push(cb);
  }

  if (logs && logs.buffer.length > 0) {
    // Initialize sending logs
    const entries = logs.buffer;
    logs.buffer = [];
    logs.outstandingRequests++;
    let cbCalled = false;
    let currentLogs = logs;
    var cbOnce = (error) => {
      if (cbCalled) return;
      cbCalled = true;
      currentLogs.outstandingRequests--;
      if (currentLogs.outstandingRequests === 0) {
        releasePendingCallbacks(currentLogs, error);
      }
    };

    var http = logs.protocol === 'http' ? Http : Https;
    var options = {
      hostname: logs.host,
      path: logs.path,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${logs.token}`,
        'Content-Type': 'application/json',
      },
      agent: false,
    };

    var request = http.request(options, (response) => {
      response.on('data', () => {});
      response.on('end', cbOnce);
      response.on('error', cbOnce);
    });
    request.on('error', cbOnce);
    request.write(JSON.stringify(entries));
    request.end();
  }
}

function writeToLogs(level, msg) {
  if (logs) {
    const logEvent = { method: logs.method, level, msg, time: new Date().toISOString() };
    logs.buffer.push(logEvent);
    requestLogs.push(logEvent);
    if (logs.buffer.length === maxBuffer) {
      sendLogsNow();
    } else {
      sendLogsAfterInterval();
    }
  }
}

function hookupConsole(console, method) {
  // Already hooked up?
  if (console[method]._fusebit) {
    return;
  }

  const oldMethod = console[method];
  console[method] = function () {
    writeToLogs(bunyanLevels[method], Util.format.apply(Util.format, arguments));
    return oldMethod.apply(console, arguments);
  };
  console[method]._fusebit = oldMethod;
}

function hookupConsoleAnnotate(console) {
  console.annotate = (msg, context, opts) => {
    const logEvent = {
      // Get the timestamp
      method: 'annotate',
      time: Date.now(),
      msg,
      context,
    };

    // Get the backtrace if opts.backtrace
    if (opts.backtrace) {
      Error.captureStackTrace(logEvent, console.annotate);
    }
    requestLogs.push(logEvent);
  };
}
