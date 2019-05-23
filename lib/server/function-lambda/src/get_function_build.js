const Assert = require('assert');
const Common = require('./common');
const create_error = require('http-errors');

module.exports = function lambda_get_function_build(req, res, next) {
  return module.exports.core(req.params, (e, r) => {
    if (e) {
      if (e.code === 'NoSuchKey') {
        return next(create_error(404));
      } else {
        return next(create_error(500, `Error getting function build status: ${e.message}.`));
      }
    }
    switch (r.status) {
      case 'success':
        res.status(200);
        break;
      case 'pending':
      case 'building':
        res.status(201);
        break;
      case 'failed':
        r = Common.create_build_error_response(r);
        res.status(r.status);
        break;
      default:
        res.status(500);
        break;
    }

    return res.json(r);
  });
};

module.exports.core = function lambda_get_function_build_core(options, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscriptionId must be specified');
  Assert.equal(typeof options.boundaryId, 'string', 'options.boundaryId must be specified');
  Assert.ok(options.boundaryId.match(Common.valid_boundary_name), 'boundary name must be valid');
  Assert.equal(typeof options.functionId, 'string', 'options.functionId  must be specified');
  Assert.ok(options.functionId.match(Common.valid_function_name), 'function name must be valid');
  Assert.equal(typeof options.buildId, 'string', 'options.buildId must be provided');

  return Common.S3.getObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_build_status_key(options),
    },
    (e, d) => {
      if (e) return cb(e);
      try {
        d.Body = JSON.parse(d.Body.toString('utf8'));
      } catch (e) {
        return cb(e);
      }
      return cb(null, d.Body);
    }
  );
};
