const create_error = require('http-errors');
const { get_function_core } = require('./get_function');
const { put_function } = require('./put_function');

const AWS = require('aws-sdk');
const Constants = require('@5qtrs/constants');
const { Common } = require('@5qtrs/runtime-common');

export function patch_function(req, res, next) {
  const options = {};
  if ('enable' in req.body) {
    options.enable = req.body.enable;
  }
  if ('rebuild' in req.body) {
    options.rebuild = true;
  }

  return rebuild_function(req, res, next, options);
}

function copy_to(dst, src) {
  Object.keys(src).forEach((k) => {
    if (typeof src[k] === 'object') {
      if (k in dst) {
        copy_to(dst[k], src[k]);
      } else {
        dst[k] = src[k];
      }
    } else {
      dst[k] = src[k];
    }
  });
}

function rebuild_function(req, res, next, options) {
  get_function_core(req.params, (e, spec) => {
    if (e) {
      if (e.code === 'NoSuchKey') {
        return next(create_error(404));
      } else {
        return next(create_error(500, `Error getting function: ${e.message}.`));
      }
    }
    // Move it to params so that put_function can see it.
    req.params.rebuild = options.rebuild;

    // Record the loaded spec into the body.
    req.body = { ...spec };
    copy_to(req.body, options);

    return put_function(req, res, next);
  });
}
