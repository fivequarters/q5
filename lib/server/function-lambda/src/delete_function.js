const Assert = require('assert');
const Async = require('async');
const { Common } = require('@5qtrs/runtime-common');
const Constants = require('@5qtrs/constants');
const create_error = require('http-errors');
const { get_function_core } = require('./get_function');
const delete_task_queue = require('./delete_task_queue');

const { delete_function_tags } = require('@5qtrs/function-tags');

export function delete_function(req, res, next) {
  return delete_function_core(req.params, (e, r) => {
    if (e) {
      if (e.code === 'ResourceNotFoundException') {
        return next(create_error(404));
      }
      if (e.code === 'TooManyRequestsException') {
        return next(create_error(429, `Error deleting function: ${e.message}.`));
      }
      return next(create_error(500, `Error deleting function: ${e.message}.`));
    }
    res.status(204);
    return res.end();
  });
}

function delete_function_core(options, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscriptionId must be specified');
  Assert.equal(typeof options.boundaryId, 'string', 'options.boundaryId must be specified');
  Assert.ok(options.boundaryId.match(Constants.valid_boundary_name), 'boundary name must be valid');
  Assert.equal(typeof options.functionId, 'string', 'options.functionId name must be specified');
  Assert.ok(options.functionId.match(Constants.valid_function_name), 'function name must be valid');

  return Async.series(
    [
      (cb) => delete_cron(options, cb),
      (cb) => delete_task_queues(options, cb),
      (cb) => delete_function_tags(options, cb),
      (cb) => delete_deployment_package(options, cb),
      (cb) => delete_function_spec(options, cb),
      (cb) => delete_user_function(options, cb),
    ],
    (e) => (e ? cb(e) : cb())
  );
}

function delete_task_queues(options, cb) {
  return get_function_core({ ...options, includeInternal: true }, (e, spec) => {
    if (e) {
      return e.code === 'NoSuchKey' ? cb() : cb(e);
    }
    const taskQueues = (spec.internal && spec.internal.taskQueues) || {};
    const plan = [];
    for (const path in taskQueues) {
      plan.push((cb) => delete_task_queue(taskQueues[path], cb));
    }
    return plan.length > 0 ? Async.eachLimit(plan, 5, (i, cb) => i(cb), cb) : cb();
  });
}

function delete_cron(options, cb) {
  return Common.S3.listObjectsV2(
    {
      Prefix: Constants.get_cron_key_prefix(options),
    },
    (e, d) => {
      if (e) return cb(e);
      return Async.eachLimit(d.Contents || [], 5, (i, cb) => Common.S3.deleteObject({ Key: i.Key }, cb), cb);
    }
  );
}

function delete_deployment_package(options, cb) {
  return Common.S3.deleteObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Constants.get_user_function_build_key(options),
    },
    (e) => (e ? cb(e) : cb())
  );
}

function delete_function_spec(options, cb) {
  return Common.S3.deleteObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Constants.get_user_function_spec_key(options),
    },
    (e) => (e ? cb(e) : cb())
  );
}

function delete_user_function(options, cb) {
  return Common.Lambda.deleteFunction(
    {
      FunctionName: Constants.get_user_function_name(options),
    },
    (e) => {
      if (e?.code === 'TooManyRequestsException') {
        setTimeout(() => delete_user_function(options, cb), 500 + Math.floor(500 * Math.random()));
        return;
      }
      return e ? cb(e) : cb();
    }
  );
}
