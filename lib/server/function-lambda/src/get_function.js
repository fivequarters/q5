const Assert = require('assert');
const Common = require('./common');
const create_error = require('http-errors');

module.exports = function lambda_get_function(req, res, next) {
  return module.exports.core(req.params, (e, r) => {
    if (e) {
      if (e.code === 'NoSuchKey') {
        return next(create_error(404));
      } else {
        return next(create_error(500, `Error getting function: ${e.message}.`));
      }
    }
    res.status(200);
    if (r.lambda && r.lambda.memory_size) {
      r.lambda.memorySize = r.lambda.memory_size;
      delete r.lambda.memory_size;
    }
    if (r.schedule && Object.keys(r.schedule).length === 0) {
      delete r.schedule;
    }
    return res.json(r);
  });
};

module.exports.core = function lambda_get_function_core(options, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscription must be specified');
  Assert.equal(typeof options.boundaryId, 'string', 'options.boundary must be specified');
  Assert.ok(options.boundaryId.match(Common.valid_boundary_name), 'boundary name must be value');
  Assert.equal(typeof options.functionId, 'string', 'function name must be specified');
  Assert.ok(options.functionId.match(Common.valid_function_name), 'function name must be valid');

  return Common.S3.getObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_spec_key(options),
    },
    (e, d) => {
      if (e) return cb(e);
      try {
        d.Body = JSON.parse(d.Body.toString('utf8'));
      } catch (e) {
        return cb(e);
      }
      if (d.Body.lambda) {
        delete d.Body.lambda.runtime;
      }
      delete d.Body.internal;
      delete d.Body.buildId;
      delete d.Body.functionId;

      return cb(null, d.Body);
    }
  );
};
