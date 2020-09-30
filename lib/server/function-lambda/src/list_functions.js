const Assert = require('assert');
const Async = require('async');
const create_error = require('http-errors');

const { search_function_tags } = require('@5qtrs/function-tags');

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
  let criteria;

  if (options.cron !== undefined) {
    // If cron is specified, use either cron=true or cron=false as the search terms.
    criteria = { cron: !!options.cron.match(/^true|1$/i) };
  } else if (options.search) {
    // Match for key, key=value, key= from the URL rather than the parameter, which is pre-parsed in a way
    // that obscures the values.
    //
    criteria = {};
    const searchRegExp = /search=([^&=]*)=?([^&]*)/g;
    let match;

    while ((match = searchRegExp.exec(options.url)) !== null) {
      const value = decodeURIComponent(match[2]);
      criteria[decodeURIComponent(match[1])] = value.length ? value : undefined;
    }
  } else {
    // Get all functions.
    criteria = {};
  }

  let maxKeys = options.count;

  if (maxKeys > (+process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS || 100)) {
    maxKeys = +process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS || 100;
  }

  // Ignore "null" search values, as they may be placeholders for other sequenced search sets.

  return search_function_tags(options, criteria, options.next, maxKeys, (error, results, next) => {
    if (error) {
      return cb(error);
    }

    // For empty results that have more data pending, try again instead of forcing a pointless roundtrip by
    // the client.
    if (results.length == 0 && next) {
      options.next = next;
      return list_functions_core(options, cb);
    }

    return cb(null, { items: results, next: next });
  });
}
