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
      var originalCb = cb;
      cb = (...args) => sendLogsNow(event.logs, () => originalCb(...args));
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

function sendLogsNow(logs, cb) {
  if (logs.sendTimeout) {
    clearTimeout(logs.sendTimeout);
    logs.sendTimeout = undefined;
  }
  sendLogs(logs, cb);
}

function sendLogsAfterInterval(logs) {
  if (!logs.sendTimeout) {
    logs.sendTimeout = setTimeout(() => {
      sendLogs(logs, () => {
        logs.sendTimeout = undefined;
      });
    }, bufferInterval);
  }
}

function sendLogs(logs, cb) {
  const entries = logs.buffer;
  logs.buffer = [];

  if (!entries.length) {
    return cb();
  }

  var cbOnce = error => {
    if (cb) cb(error);
    cb = undefined;
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
  };

  var request = http.request(options, response => response.on('end', cbOnce));
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
  var oldMethod = console[method];
  console[method] = function() {
    writeToLogs(bunyanLevels[method], Util.format.apply(Util.format, arguments), logs);
    return oldMethod.apply(console, arguments);
  };
}
