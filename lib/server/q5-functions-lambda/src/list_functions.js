const Assert = require('assert');
const Async = require('async');
const Common = require('./common');
const create_error = require('http-errors');

module.exports = function lambda_list_functions(req, res, next) {
  return module.exports.core(
    {
      subscriptionId: req.params.subscriptionId,
      boundaryId: req.params.boundaryId,
      next: req.query.next,
      count: isNaN(req.query.count) ? undefined : +req.query.count,
    },
    (e, r) => {
      if (e) {
        return next(create_error(500, `Error getting function: ${e.message}.`));
      }
      res.status(200);
      return res.json(r);
    }
  );
};

module.exports.core = function lambda_list_functions_core(options, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscriptionId must be specified');
  Assert.equal(typeof options.boundaryId, 'string', 'options.boundaryId must be specified');
  Assert.ok(options.boundaryId.match(Common.valid_boundary_name), 'boundaryId name must be valid');
  if (options.next) {
    Assert.ok(typeof options.next === 'string', 'next function name must be a string if specified');
    Assert.ok(options.next.match(Common.valid_function_name), 'next function name must be valid if specified');
  }

  var list_params = {
    Prefix: `${Common.function_spec_key_prefix}/${options.subscriptionId}/${options.boundaryId}/`,
    MaxKeys: Math.min(
      options.count || +process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS,
      +process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS
    ),
  };

  if (options.next) {
    list_params.StartAfter = `${Common.function_spec_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${
      options.next
    }`;
  }

  return Common.S3.listObjectsV2(list_params, (e, docs) => {
    if (e) return cb(e);
    let items = docs.Contents.map(x => x.Key.split('/')[2]);
    return docs.IsTruncated ? cb(null, { next: items[items.length - 1], items }) : cb(null, { items });
  });
};
