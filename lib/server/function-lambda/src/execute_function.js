const create_error = require('http-errors');
const Common = require('@5qtrs/runtime-common');
const write_logs = require('./write_logs');

exports.execute_function = (req, res, next) => {
  Common.invoke_function(req, (e, r, m) => invoke_handler(req, res, next, e, r, m));
};

const invoke_handler = (req, res, next, e, r, m) => {
  // Copy over the meta context into the result object.
  res.set('x-fx-response-source', m.source);
  res.metrics = m.metrics;
  res.functionLogs = r?.logs || [];
  res.functionSpans = r?.spans || [];
  res.error = m.error || e;

  if (e) {
    if (!r) {
      // No response; just a normal error.
      return next(e);
    }

    // Write the response to the realtime logs in Dynamo.
    return write_logs(
      req.params,
      [{ level: 50, msg: m.error.errorMessage, time: new Date().toISOString(), properties: r }],
      (e) => {
        let errorCode = 500;
        // Return a 522 instead of 500. CloudFlare uses the error code to indicate a connection timeout on the origin webserver
        // As much as it sucks to use a string include based time out detection
        // AWS does not set a proper errorType for backend timeouts
        if (m.error.errorMessage.includes('timed out')) {
          errorCode = 522;
        }
        res.status(errorCode);
        return res.json({
          status: errorCode,
          statusCode: errorCode,
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
    for (let h in r.headers) {
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
