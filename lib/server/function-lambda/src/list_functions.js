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

function merge_results(e, d, cb) {
  let result = {};

  // If error, return that
  if (e) {
    return cb(e);
  }

  // First entry is null, no responses.
  if (d.length == 0 || !d[0]) {
    return cb(null, { items: [] });
  }

  // Populate with the entries that are in the first set.
  d[0].items.forEach((f) => (result[f.location] = f));

  for (let i = 1; i < d.length; i++) {
    const newResult = {};

    // Empty result, no matches.
    if (!d[i] || d[i].items.length == 0) {
      result = {};
      break;
    }

    // Save only the matching entries
    d[i].items.forEach((f) => (newResult[f.location] = result[f.location]));
    result = newResult;
  }

  const nexts = d.map((i) => i.next);

  return cb(null, { items: Object.values(result), next: nexts });
}

function list_functions_core(options, cb) {
  let key, value, searchNext;

  if (options.cron !== undefined) {
    // If cron is specified, use either cron=true or cron=false as the search terms.
    key = 'cron';
    value = !!options.cron.match(/^true|1$/i);
    searchNext = options.next;
  } else if (options.search) {
    if (typeof options.search === 'object') {
      // Multiple search requests have been specified; perform them all and merge the results.
      let idx = 0;
      return Async.parallel(
        options.search.map((key) => {
          return (pcb) => list_functions_core({ ...options, search: key, searchIdx: idx++ }, pcb);
        }),
        (e, d) => merge_results(e, d, cb)
      );
    } else {
      // Match for key, key=value, key= from the URL rather than the parameter.
      //
      const criteria = [...options.url.matchAll(/search=([^&=]*)=?([^&]*)/g)];

      // If searchIdx is set (because this is part of a multi-part search) then use that match from the url,
      // as well as that offset `next` value, if present.
      const idx = options.searchIdx || 0;
      key = decodeURIComponent(criteria[idx][1]);
      value = decodeURIComponent(criteria[idx][2]);
      value = value.length ? value : undefined;
      searchNext = typeof options.next === 'object' ? options.next[idx] : options.next;
    }
  } else {
    // Get all functions - every function has a 'cron', which may be true or false.
    key = 'cron';
    value = undefined;
    searchNext = options.next;
  }

  let maxKeys = options.count;

  if (maxKeys > (+process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS || 100)) {
    maxKeys = +process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS || 100;
  }

  return search_function_tags(options, key, value, searchNext, maxKeys, (error, results, next) => {
    if (error) {
      return cb(error);
    }
    return cb(null, { items: results, next: next });
  });
}
