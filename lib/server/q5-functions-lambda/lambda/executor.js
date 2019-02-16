var Assert = require('assert');
var handler = require('./app/index');
var Util = require('util');

var bunyanLevels = {
  stdout: 30,
  stderr: 50,
  log: 30,
  error: 50,
};

var ws = undefined;
var applicationName;
var buffer = [];

exports.execute = function execute(event, context, cb) {
  return !ws && event.logs ? setupRealTimeLogs() : processRequest();

  function processRequest() {
    try {
      Assert.equal(typeof handler, 'function', 'The module export must be a function.');
      Assert.equal(handler.length, 2, 'The function must take two parameters: (ctx, cb).');

      if (ws) {
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

  function setupRealTimeLogs() {
    const WebSocket = require('ws');
    var nextCalled;

    applicationName = 'application:' + event.boundary + ':' + event.name;
    ws = new WebSocket(event.logs.url, { headers: { Authorization: 'Bearer ' + event.logs.token } });
    ws.once('open', next);
    ws.once('error', next);
    ws.once('close', next);
    hookupStream('stdout');
    hookupStream('stderr');
    return processRequest();

    function next() {
      if (nextCalled) return;
      nextCalled = true;
      try {
        ws._socket.unref(); // prevent Lambda process from hanging on this open socket
      } catch (_) {}
      if (ws.readyState === 1) {
        buffer.forEach(send);
        buffer = undefined;
      }
    }
  }
};

function hookupStream(stream) {
  var oldWrite = process[stream].write;
  process[stream].write = function(chunk, encoding, callback) {
    if (typeof chunk === 'string' && ws.readyState < 2) {
      var msg = JSON.stringify({
        name: applicationName,
        level: bunyanLevels[stream],
        msg: chunk,
        time: new Date().toISOString(),
      });
      if (ws.readyState === 0) {
        // connecting
        buffer.push(msg);
      } else if (ws.readyState === 1) {
        // open
        send(msg);
      }
    }
    return oldWrite.call(process[stream], chunk, encoding, callback);
  };
}

function hookupConsole(console, method) {
  var oldMethod = console[method];
  console[method] = function() {
    if (ws.readyState < 2) {
      var msg = JSON.stringify({
        name: applicationName,
        level: bunyanLevels[method],
        msg: Util.format.apply(Util.format, arguments),
        time: new Date().toISOString(),
      });
      if (ws.readyState === 0) {
        // connecting
        buffer.push(msg);
      } else {
        // open
        send(msg);
      }
    }
    return oldMethod.apply(console, arguments);
  };
}

function send(msg) {
  try {
    ws.send(msg);
  } catch (_) {}
}
