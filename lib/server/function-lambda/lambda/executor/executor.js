var Assert = require('assert');
var handler = require('./app/index');
var Util = require('util');

var maxBuffer = +process.env.Q5_LOGS_MAX_BUFFER || 25;
var bufferInterval = +process.env.Q5_LOGS_BUFFER_INTERVAL || 100;

var bunyanLevels = { log: 30, error: 50 };

var logs;

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

exports.execute = function execute(event, context, cb) {
  Assert.equal(typeof handler, 'function', 'The module export must be a function.');

  event.configuration = process.env;

  // Register the logging system
  cb = updateLogs(event, cb);

  // Handle the asynchronous case
  if (handler.constructor.name === 'AsyncFunction') {
    Assert.equal(handler.length, 1, 'The function must take one parameter: async (ctx).');

    // Guarantee the logs are sent after the Promise completes.
    return handler(event).finally(() => {
      return new Promise((resolve, reject) => sendLogsNow(() => resolve()));
    });
  }

  // Handle the synchronous case
  Assert.equal(handler.length, 2, 'The function must take two parameters: (ctx, cb).');

  try {
    handler(event, cb);
  } catch (e) {
    return cb(e);
  }
};

function updateLogs(event, cb) {
  if (event.logs) {
    if (!logs) {
      logs = event.logs;
      logs.buffer = [];
      logs.outstandingRequests = 0;
      logs.pendingCallbacks = [];
    } else {
      logs.token = event.logs.token;
    }
    var originalCb = cb;
    cb = (...args) => {
      sendLogsNow(() => {
        originalCb(...args);
      });
    };
    hookupConsole(console, 'log');
    hookupConsole(console, 'error');
  } else {
    sendLogsNow();
    logs = undefined;
  }

  return cb;
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

    var http = logs.protocol === 'http' ? require('http') : require('https');
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
    logs.buffer.push({ level, msg, time: new Date().toISOString() });
    if (logs.buffer.length === maxBuffer) {
      sendLogsNow();
    } else {
      sendLogsAfterInterval();
    }
  }
}

function hookupConsole(console, method) {
  if (console[method]._fusebit) return;
  var oldMethod = console[method];
  console[method] = function () {
    writeToLogs(bunyanLevels[method], Util.format.apply(Util.format, arguments));
    return oldMethod.apply(console, arguments);
  };
  console[method]._fusebit = true;
}
