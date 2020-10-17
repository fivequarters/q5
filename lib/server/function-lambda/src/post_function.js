const create_error = require('http-errors');
const { get_function_core } = require('./get_function');
const { put_function } = require('./put_function');

const AWS = require('aws-sdk');
const Constants = require('@5qtrs/constants');
const { Common } = require('@5qtrs/runtime-common');

export function post_function(req, res, next) {
  if (req.body.rebuild) {
    return rebuild_function(req, res, next);
  } else if (req.body.suspend) {
    return suspend_function(req, res, next);
  } else if (req.body.resume) {
    return resume_function(req, res, next);
  } else {
    return next(create_error(404, 'unknown command'));
  }
}

function rebuild_function(req, res, next) {
  get_function_core(req.params, (e, spec) => {
    if (e) {
      if (e.code === 'NoSuchKey') {
        return next(create_error(404));
      } else {
        return next(create_error(500, `Error getting function: ${e.message}.`));
      }
    }
    // Record the loaded spec into the body.
    req.body = spec;

    // Move it to params so that put_function can see it.
    req.params.rebuild = true;

    return put_function(req, res, next);
  });
}

function suspend_function(req, res, next) {
  Common.Lambda.putFunctionConcurrency(
    { FunctionName: Constants.get_user_function_name(options), ReservedConcurrentExecutions: 0 },
    (err, data) => {
      if (err) {
        return next(create_error(500, err));
      }
      res.status(200);
    }
  );
}

function resume_function(req, res, next) {
  Common.Lambda.deleteProvisionedConcurrencyConfig(
    { FunctionName: Constants.get_user_function_name(options) },
    (err, data) => {
      if (err) {
        return next(create_error(500, err));
      }
      res.status(200);
    }
  );
}
