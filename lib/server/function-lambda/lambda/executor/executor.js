var Assert = require('assert');
var handler = require('./app/index');
var Util = require('util');

var maxBuffer = +process.env.Q5_LOGS_MAX_BUFFER || 25;
var bufferInterval = +process.env.Q5_LOGS_BUFFER_INTERVAL || 100;

var bunyanLevels = { log: 30, error: 50 };

exports.execute = function execute(event, context, cb) {
  try {
    Assert.equal(typeof handler, 'function', 'The module export must be a function.');
    Assert.equal(handler.length, 2, 'The function must take two parameters: (ctx, cb).');

    if (event.logs) {
      event.logs.buffer = [];
      event.logs.outstandingRequests = 0;
      var originalCb = cb;
      cb = (...args) => {
        event.logs.pendingCallback = () => originalCb(...args);
        sendLogsNow(event.logs);
      };
      hookupConsole(console, 'log', event.logs);
      hookupConsole(console, 'error', event.logs);
    }

    event.configuration = process.env;

    return handler(event, cb);
  } catch (e) {
    console.error('EXECUTION ERROR', e);
    return cb(e);
  }
};

function sendLogsNow(logs) {
  if (logs.sendTimeout) {
    clearTimeout(logs.sendTimeout);
    logs.sendTimeout = undefined;
  }
  sendLogs(logs);
}

function sendLogsAfterInterval(logs) {
  if (!logs.sendTimeout) {
    logs.sendTimeout = setTimeout(() => {
      logs.sendTimeout = undefined;
      sendLogs(logs);
    }, bufferInterval);
  }
}

function sendLogs(logs) {
  const entries = logs.buffer;
  logs.buffer = [];

  if (!entries.length) {
    if (logs.outstandingRequests === 0 && logs.pendingCallback) {
      return logs.pendingCallback();
    } else {
      return;
    }
  }

  logs.outstandingRequests++;
  let cbCalled = false;
  var cbOnce = error => {
    if (cbCalled) return;
    cbCalled = true;
    logs.outstandingRequests--;
    if (logs.outstandingRequests === 0 && logs.pendingCallback) {
      logs.pendingCallback(error);
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

  var request = http.request(options, response => response.on('close', cbOnce));
  request.on('error', cbOnce);
  request.write(JSON.stringify(entries));
  request.end();
}

function writeToLogs(level, msg, logs) {
  logs.buffer.push({ level, msg, time: new Date().toISOString() });
  if (logs.buffer.length === maxBuffer) {
    sendLogsNow(logs);
  } else {
    sendLogsAfterInterval(logs);
  }
}

function hookupConsole(console, method, logs) {
  if (console[method]._fusebit) return;
  var oldMethod = console[method];
  console[method] = function() {
    writeToLogs(bunyanLevels[method], Util.format.apply(Util.format, arguments), logs);
    return oldMethod.apply(console, arguments);
  };
  console[method]._fusebit = true;
}
