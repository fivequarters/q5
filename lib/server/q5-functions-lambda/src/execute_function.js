const Assert = require('assert');
const Common = require('./common');
const create_error = require('http-errors');
const Jwt = require('jsonwebtoken');

module.exports = function lambda_execute_function(req, res, next) {
  return module.exports.core(
    {
      boundary: req.params.boundary,
      name: req.params.name,
      method: req.method,
      url: req.url,
      body: req.body || {},
      headers: req.headers,
      query: req.query,
    },
    (e, r) => {
      if (e) {
        res.set('x-fx-response-source', 'proxy');
        if (e.code === 'ResourceNotFoundException') {
          return next(create_error(404));
        } else {
          return next(create_error(500, `Error getting function: ${e.message}.`));
        }
      }

      res.set('x-fx-response-source', 'provider');
      if (r.LogResult) {
        res.set('x-fx-logs', r.LogResult);
      }
      if (r.FunctionError) {
        res.status(500);
        return res.json({ error: r.Payload });
      }
      if (r.Payload) {
        // Assert.equal(typeof r.Payload, 'object', 'Lambda response payload is an object');
        res.status(r.Payload.status || 200);
        if (r.Payload.headers) {
          Assert.equal(typeof r.Payload.headers, 'object', 'Lambda payload.headers is an object');
          for (var h in r.Payload.headers) {
            Assert.equal(typeof r.Payload.headers[h], 'string', `Lambda payload.headers[${h}] must be a string`);
            res.set(h, r.Payload.headers[h]);
          }
        }
        return r.Payload.body ? res.json(r.Payload.body) : res.end();
      } else {
        res.status(200);
        return res.end();
      }
    }
  );
};

module.exports.core = function lambda_execute_function_core(options, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.boundary, 'string', 'options.boundary must be specified');
  Assert.ok(options.boundary.match(Common.valid_boundary_name), 'boundary name must be value');
  Assert.equal(typeof options.name, 'string', 'function name must be specified');
  Assert.ok(options.name.match(Common.valid_function_name), 'function name must be valid');
  Assert.ok(options.method, 'query must be specified');
  Assert.ok(options.body, 'body must be specified');
  Assert.ok(options.headers, 'headers must be specified');
  Assert.ok(options.query, 'query must be specified');
  Assert.ok(options.url, 'query must be specified');

  // Create a token to allow the Lambda function to authorize to websocket endpoint
  if (process.env.LOGS_WS_URL) {
    options.logs = {
      token: Jwt.sign({ boundary: options.boundary, name: options.name }, process.env.LOGS_WS_TOKEN_SIGNATURE_KEY, {
        expiresIn: +process.env.LOGS_WS_TOKEN_EXPIRY || 30,
      }),
      url: process.env.LOGS_WS_URL,
    };
  }

  let invoke_params = {
    FunctionName: Common.get_user_function_name(options),
    Payload: JSON.stringify(options),
    InvocationType: 'RequestResponse',
    LogType: 'Tail',
  };

  return Common.Lambda.invoke(invoke_params, (e, d) => {
    if (d) {
      try {
        if (d.Payload) {
          d.Payload = JSON.parse(d.Payload);
        }
        // if (d.LogResult) {
        //     d.LogResult = new Buffer(d.LogResult, 'base64').toString('utf8');
        // }
      } catch (e) {
        return cb(e);
      }
    }
    return cb(e, d);
  });
};
