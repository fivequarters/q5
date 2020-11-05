const create_error = require('http-errors');
const { get_function_core } = require('./get_function');
const { put_function } = require('./put_function');

const AWS = require('aws-sdk');
const Constants = require('@5qtrs/constants');
const { Common } = require('@5qtrs/runtime-common');

export function post_function_build(req, res, next) {
  get_function_core(req.params, (e, spec) => {
    if (e) {
      if (e.code === 'NoSuchKey') {
        return next(create_error(404));
      } else {
        return next(create_error(500, `Error getting function: ${e.message}.`));
      }
    }
    // Move it to params so that put_function can see it.
    req.params.rebuild = true;

    // Record the loaded spec into the body.
    req.body = spec;

    return put_function(req, res, next);
  });
}
