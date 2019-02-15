const Zmq = require('zeromq');
const Assert = require('assert');
const create_error = require('http-errors');

let activeConnections = 0;
const maxActiveConnections = +process.env.API_LOG_MAX_ACTIVE_CONNECTIONS || 1000;

module.exports = options => {
  Assert.ok(options);
  Assert.equal(
    typeof options.topic,
    'function',
    'options.topic must be a function mapping request to ZMQ topic prefix'
  );

  return (req, res, next) => {
    if (activeConnections >= maxActiveConnections) {
      return next(create_error(503, 'Server too busy, try again later.'));
    }

    // Subscribe to appropriate topic
    let topicPrefix = options.topic(req);
    let xpub = process.env.ZMQ_XPUB || 'tcp://127.0.0.1:5001';
    let ssoc;
    try {
      ssoc = Zmq.socket('sub');
      ssoc.connect(xpub);
      ssoc.subscribe(topicPrefix);
    } catch (e) {
      try {
        ssoc.close();
      } catch (_) {}
      return next(create_error(500, `Unable to connect to internal pub/sub system: ${e.message}`));
    }

    // Initialize text/event-stream response and start pumping messages

    activeConnections++;

    try {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      res.write(`: subscribed to ${topicPrefix}\n\n`);
    } catch (e) {
      return done(e);
    }

    // Keep the response connection alive in case there are no log messages to send
    let keepAlive = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch (e) {
        done(e);
      }
    }, +process.env.API_LOGS_KEEPALIVE_INTERVAL || 20000);

    // Enforce max connection duration
    let timeout = setTimeout(() => done(), +process.env.API_LOG_MAX_CONNECTION_TIME || 600000);

    // Send messages received from ZMQ to the client
    ssoc.on('message', data => {
      if (!data) return;
      data = data.toString();
      let i = data.indexOf(' ');
      if (i < 0) return;
      let message = data.substring(i + 1);
      try {
        res.write(`event: log\ndata: ${message}\n\n`);
      } catch (e) {
        return done(e);
      }
    });

    req.once('close', () => done());
    req.socket.once('error', e => done(e));
    req.socket.once('close', () => done());
    res.once('finish', () => done());
    res.once('close', () => done());
    res.once('error', e => done(e));
    ssoc.once('error', e => done(e));
    ssoc.once('close', () => done());

    // Cleanup logic
    let isDone;
    function done(error) {
      if (isDone) return;
      isDone = true;
      activeConnections--;
      try {
        res.end();
      } catch (_) {}
      try {
        ssoc.unsubscribe(topicPrefix);
      } catch (_) {}
      try {
        ssoc.close();
      } catch (_) {}
      clearInterval(keepAlive);
      clearTimeout(timeout);
    }
  };
};
