var Assert = require('assert');
var handler = require('./app/index');
var Util = require('util');

var config = {
  backoffRandomOffsetRange: +process.env.Q5_LOGS_WS_INITIAL_BACKOFF_RANDOM_OFFSET_RANGE || 2000,
  initialBackoff: +process.env.Q5_LOGS_WS_INITIAL_BACKOFF || 500,
  backoffRatio: +process.env.Q5_LOGS_WS_BACKOFF_RATIO || 1.2,
  maxBackoff: +process.env.Q5_LOGS_WS_MAX_BACKOFF || 60000,
  maxBuffer: +process.env.Q5_LOGS_WS_MAX_BUFFER || 100,
};

var bunyanLevels = {
  stdout: 30,
  stderr: 50,
  log: 30,
  error: 50,
};

// real-time logs
var realTimeLogsSetup = false;
var currentWs = undefined;
var currentBackoff = config.initialBackoff;
var applicationName;
var buffer = [];
var latestLogs;

exports.execute = function execute(event, context, cb) {
  latestLogs = event.logs || latestLogs;
  return !realTimeLogsSetup && event.logs ? setupRealTimeLogs(event, context, cb) : processRequest(event, context, cb);
};

function processRequest(event, context, cb) {
  try {
    Assert.equal(typeof handler, 'function', 'The module export must be a function.');
    Assert.equal(handler.length, 2, 'The function must take two parameters: (ctx, cb).');

    if (realTimeLogsSetup) {
      hookupConsole(console, 'log');
      hookupConsole(console, 'error');
    }

    event.configuration = process.env;

    return handler(event, cb);
  } catch (e) {
    console.error('EXECUTION ERROR', e);
    return cb(e);
  }
}

function setupRealTimeLogs(event, context, cb) {
  realTimeLogsSetup = true;
  process.nextTick(function() {
    startLogsExport(event);
  });
  return processRequest(event, context, cb);
}

function startLogsExport(event) {
  const WebSocket = require('ws');
  applicationName = 'application:' + event.boundary + ':' + event.name;

  hookupStream('stdout');
  hookupStream('stderr');

  return connect();

  function connect() {
    var ws = new WebSocket(latestLogs.url, { headers: { Authorization: 'Bearer ' + latestLogs.token } });
    ws.once('open', function() {
      try {
        ws._socket.unref(); // prevent Lambda process from hanging on this open socket
      } catch (_) {}
      currentWs = ws;
      flushLogs();
    });
    ws.once('error', onClose);
    ws.once('close', onClose);
    var onCloseCalled;
    function onClose() {
      if (onCloseCalled) return;
      onCloseCalled = true;
      currentWs = undefined;

      // reconnect with exponential backoff with a cap and a random initial offset
      var effectiveBackoff = currentBackoff;
      if (effectiveBackoff === config.initialBackoff) {
        effectiveBackoff += Math.floor(Math.random() * config.backoffRandomOffsetRange);
      }
      currentBackoff = Math.min(Math.floor(currentBackoff * config.backoffRatio), config.maxBackoff);
      setTimeout(connect, effectiveBackoff).unref();
    }
  }
}

function flushLogs() {
  if (currentWs && currentWs.readyState === 1) {
    for (var msg = buffer.shift(); msg; msg = buffer.shift()) {
      try {
        currentWs.send(msg);
      } catch (_) {}
    }
  }
}

function hookupStream(stream) {
  var oldWrite = process[stream].write;
  process[stream].write = function(chunk, encoding, callback) {
    if (typeof chunk === 'string') {
      if (buffer.length < config.maxBuffer) {
        buffer.push(
          JSON.stringify({
            name: applicationName,
            level: bunyanLevels[stream],
            msg: chunk,
            time: new Date().toISOString(),
          })
        );
      } else if (buffer.length === config.maxBuffer) {
        buffer.push(
          JSON.stringify({
            name: applicationName,
            level: bunyanLevels['stdout'],
            msg: 'INTERNAL ERROR. SOME LOGS MAY BE MISSING BEYOND THIS POINT.',
            time: new Date().toISOString(),
          })
        );
      }
      flushLogs();
    }
    return oldWrite.call(process[stream], chunk, encoding, callback);
  };
}

function hookupConsole(console, method) {
  var oldMethod = console[method];
  console[method] = function() {
    if (buffer.length < config.maxBuffer) {
      buffer.push(
        JSON.stringify({
          name: applicationName,
          level: bunyanLevels[method],
          msg: Util.format.apply(Util.format, arguments),
          time: new Date().toISOString(),
        })
      );
    } else if (buffer.length === config.maxBuffer) {
      buffer.push(
        JSON.stringify({
          name: applicationName,
          level: bunyanLevels['error'],
          msg: 'INTERNAL ERROR. SOME LOGS MAY BE MISSING BEYOND THIS POINT.',
          time: new Date().toISOString(),
        })
      );
    }
    flushLogs();
    return oldMethod.apply(console, arguments);
  };
}
