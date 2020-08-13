const Assert = require('assert');
const Async = require('async');
const { Common } = require('@5qtrs/runtime-common');
const create_error = require('http-errors');

const { search_function_tags } = require('./manage_tags');

export function list_functions(req, res, next) {
  return list_functions_core(
    {
      req,
      accountId: req.params.accountId,
      subscriptionId: req.params.subscriptionId,
      boundaryId: req.params.boundaryId,
      next: req.query.next,
      count: isNaN(req.query.count) ? undefined : +req.query.count,
      cron: req.query.cron,
      search: req.query.search,
      url: req.originalUrl,
    },
    (e, r) => {
      if (e) {
        return next(create_error(500, `Error listing functions: ${e.message}.`));
      }
      res.status(200);
      return res.json(r);
    }
  );
}

function list_functions_core(options, cb) {
  let key, value;

  if (options.cron !== undefined) {
    // If cron is specified, use either cron=true or cron=false as the search terms.
    key = 'cron';
    value = !!options.cron.match(/^true|1$/i);
  } else if (options.search) {
    // Match for key, key=value, key=
    const q = options.url.match(/search=([^&=]*)=?([^&]*)/);
    key = decodeURIComponent(q[1]);
    value = decodeURIComponent(q[2]);
    value = value.length ? value : undefined;
  } else {
    // Get all functions - every function has a 'cron', which may be true or false.
    key = 'cron';
    value = undefined;
  }

  let maxKeys = options.count;

  if (maxKeys > (+process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS || 100)) {
    maxKeys = +process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS || 100;
  }

  return search_function_tags(options, key, value, options.next, maxKeys, (error, results, next) => {
    if (error) {
      return cb(error);
    }
    return cb(null, { items: results, next: next });
  });
}
