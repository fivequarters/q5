const Zmq = require('zeromq');
const Assert = require('assert');
const create_error = require('http-errors');

let activeConnections = 0;
const maxActiveConnections = +process.env.API_LOG_MAX_ACTIVE_CONNECTIONS || 1000;

module.exports = options => {
  Assert.ok(options);
  Assert.ok(['boundary', 'function'].indexOf(options.scope) > -1, 'options.scope must be boundary or function');

  return (req, res, next) => {
    if (activeConnections >= maxActiveConnections) {
      return next(create_error(503, 'Server too busy, try again later.'));
    }

    // Subscribe to appropriate topic

    // Topic structure is logs:boundary:{boundary_name}:[function:{function_name}:]
    let topicPrefix = `logs:boundary:${req.params.boundary}:`;
    if (options.scope === 'function') {
      topicPrefix += `function:${req.params.name}:`;
    }
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
      res.write(
        options.scope === 'function'
          ? `: subscribed to "${req.params.boundary}/${req.params.name}" function logs\n\n`
          : `: subscribed to "${req.params.boundary}" boundary logs\n\n`
      );
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

    res.on('error', e => done(e));
    ssoc.on('error', e => done(e));

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
        ssoc.close();
      } catch (_) {}
      clearInterval(keepAlive);
      clearTimeout(timeout);
    }
  };
};
