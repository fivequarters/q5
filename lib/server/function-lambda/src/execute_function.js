const create_error = require('http-errors');
const Logging = require('./logging');
const write_logs = require('./write_logs');

exports.execute_function = (req, res, next) => {
  Logging.create_logging_token(req);

  Runtime.invoke_function(req, invoke_handler);
}

const invoke_handler = (e, r, m) => {
  // Copy over the meta context into the result object.
  res.set('x-fx-response-source', m.source);
  res.metrics = m.metrics;
  res.error = m.error || e;

  if (m.log) {
    res.set('x-fx-logs', Buffer.from(m.log.join('\n')).toString('base64'));
  }

  if (e) {
    if (!r) {
      // No response; just a normal error.
      return next(e);
    }

    // Write the response to the realtime logs in Dynamo.
    return write_logs(
      req.params,
      [{ level: 50, msg, time: new Date().toISOString(), properties: r }],
      e => {
        res.status(500);
        return res.json({
          status: 500,
          statusCode: 500,
          message: m.error.errorMessage,
          properties: r,
        });
      }
    );
  }

  // No response; fast exit.
  if (!r) {
    res.status(200);
    return res.end();
  }

  // Process the result from the invocation.
  res.status(r.status || 200);

  // Copy headers over from the returned result.
  if (typeof r.headers === 'object') {
    for (var h in r.headers) {
      res.set(h, r.headers[h]);
    }
  }

  // Dispatch the body, if supplied.
  if (!r.body) {
    return res.end();
  }

  if (r.bodyEncoding && typeof r.body === 'string') {
    return res.end(r.body, r.bodyEncoding);
  } else {
    return res.json(r.body);
  }
};
