const Assert = require('assert');
const Async = require('async');
const Common = require('./common');
const create_error = require('http-errors');

module.exports = function lambda_delete_function(req, res, next) {
    return module.exports.core(req.params, (e, r) => {
        if (e) {
            return next(create_error(500, `Error getting function: ${e.message}.`));
        }
        res.status(204);
        return res.end();
    });
};

module.exports.core = function lambda_delete_function_core(options, cb) {
    Assert.ok(options);
    Assert.equal(typeof(options.boundary), 'string', 'options.boundary must be specified');
    Assert.ok(options.boundary.match(Common.valid_boundary_name), 'boundary name must be value');
    Assert.equal(typeof(options.name), 'string', 'function name must be specified');
    Assert.ok(options.name.match(Common.valid_function_name), 'function name must be valid');

    return Async.series([
        (cb) => delete_deployment_package(options, cb),
        (cb) => delete_function_spec(options, cb),
        (cb) => delete_user_function(options, cb),
    ], e => e ? cb(e) : cb());
};

function delete_deployment_package(options, cb) {
    return Common.S3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: Common.get_user_function_build_key(options),
    }, e => e ? cb(e) : cb());
}

function delete_function_spec(options, cb) {
    return Common.S3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: Common.get_user_function_spec_key(options),
    }, e => e ? cb(e) : cb());
}

function delete_user_function(options, cb) {
    return Common.Lambda.deleteFunction({
        FunctionName: Common.get_user_function_name(options),
    }, e => e && e.code !== 'ResourceNotFoundException' ? cb(e) : cb());
}
