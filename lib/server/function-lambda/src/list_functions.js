const Assert = require('assert');
const Async = require('async');
const { Common } = require('@5qtrs/runtime-common');
const create_error = require('http-errors');

const { search_function_tags } = require('./manage_tags');

export function list_functions(req, res, next) {
  if (req.query.next) {
    try {
      req.query.next = Buffer.from(req.query.next, 'hex').toString('utf8');
      let tokens = req.query.next.split('/');
      if (tokens.length !== 2) throw new Error('Invalid');
      if (!tokens[0].match(Common.valid_function_name)) throw new Error('Invalid');
      if (!tokens[1].match(Common.valid_function_name)) throw new Error('Invalid');
    } catch (e) {
      return next(create_error(400, 'Invalid value of the `next` parameter.'));
    }
  }
  return list_functions_core(
    {
      accountId: req.params.accountId,
      subscriptionId: req.params.subscriptionId,
      boundaryId: req.params.boundaryId,
      next: req.query.next,
      count: isNaN(req.query.count) ? undefined : +req.query.count,
      cron: req.query.cron === undefined ? undefined : !!req.query.cron.match(/^true|1$/i),
      search: req.query.search,
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
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscriptionId must be specified');
  if (options.boundaryId) {
    Assert.equal(typeof options.boundaryId, 'string', 'options.boundaryId must be a string if specified');
    Assert.ok(options.boundaryId.match(Common.valid_boundary_name), 'boundaryId name must be valid');
  }
  if (options.next) {
    Assert.ok(typeof options.next === 'string', 'next function name must be a string if specified');
  }
  let ctx = { all_cron_jobs: [], result: {} };

  return Async.series(
    options.search
      ? [(cb) => get_functions_by_search(cb)]
      : [(cb) => get_cron_jobs(undefined, cb), (cb) => get_functions(cb)],
    (e) => {
      if (e) return cb(e);
      try {
        create_results();
      } catch (e) {
        return cb(e);
      }
      return cb(null, ctx.result);
    }
  );

  function get_functions_by_search(cb) {
    // XXX Might be nice to be able to filter by cron, but I don't know if that's in the spec file or not.
    const q = decodeURIComponent(options.search);
    const idx = q.indexOf('=');
    let key, value;
    if (idx < 0) {
      // Key only
      key = q;
      value = undefined;
    } else {
      key = q.slice(0, idx); // Split on the first = sign, ignoring the rest.
      value = q.slice(idx + 1);
    }
    return search_function_tags(options, key, value, options.next, options.count, (error, results, next) => {
      ctx.all_functions = results;
      ctx.result.next = next;
      cb();
    });
  }

  function create_results() {
    if (options.cron === true) {
      // Only CRON jobs are to be returned
      return (ctx.result.items = ctx.all_cron_jobs);
    }

    // Add CRON information to functions and filter down the results returned to either all functions or just Non-CRON functions
    let cron_jobs = {};
    ctx.all_cron_jobs.forEach((x) => (cron_jobs[`${x.boundaryId}/${x.functionId}`] = x.schedule));
    ctx.result.items = [];
    ctx.all_functions.forEach((x) => {
      let schedule = cron_jobs[`${x.boundaryId}/${x.functionId}`];
      if (schedule) x.schedule = schedule;
      if (options.cron === undefined) {
        // Return both Non-CRON and CRON functions
        ctx.result.items.push(x);
      } else if (!schedule) {
        // && options.cron === false
        // Return only Non-CRON functions
        ctx.result.items.push(x);
      }
    });
  }

  function get_cron_jobs(continuationToken, cb) {
    var list_params = {
      Prefix:
        `${Common.cron_key_prefix}/${options.subscriptionId}/` + (options.boundaryId ? `${options.boundaryId}/` : ''),
      ContinuationToken: continuationToken,
    };

    return Common.S3.listObjectsV2(list_params, (e, docs) => {
      if (e) return cb(e);
      ctx.all_cron_jobs = ctx.all_cron_jobs.concat(
        docs.Contents.map((x) => {
          let tokens = x.Key.split('/');
          let scheduleArray = JSON.parse(Buffer.from(tokens[4], 'hex').toString('utf8'));
          return {
            boundaryId: tokens[2],
            functionId: tokens[3],
            schedule: {
              cron: scheduleArray[0],
              timezone: scheduleArray[1],
            },
          };
        })
      );
      return docs.IsTruncated ? get_cron_jobs(docs.NextContinuationToken, cb) : cb();
    });
  }

  function get_functions(cb) {
    // If we are only interested in cron jobs, we have enough information collected by the get_cron_jobs already
    if (options.cron === true) return cb();
    // Otherwise list all functions

    // calculate max keys
    let maxKeys = 25; // default limit for all list APIs
    if (options.count) {
      maxKeys = options.count;
    }
    if (maxKeys > (+process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS || 100)) {
      maxKeys = +process.env.LAMBDA_LIST_FUNCTIONS_MAX_RESULTS || 100;
    }
    if (options.next) {
      maxKeys++;
    }

    var list_params = {
      Prefix:
        `${Common.function_spec_key_prefix}/${options.subscriptionId}/` +
        (options.boundaryId ? `${options.boundaryId}/` : ''),
      MaxKeys: maxKeys,
    };

    if (options.next) {
      list_params.StartAfter = `${Common.function_spec_key_prefix}/${options.subscriptionId}/${options.next}/`;
    }
    return Common.S3.listObjectsV2(list_params, (e, docs) => {
      if (e) return cb(e);
      ctx.all_functions = docs.Contents.map((x) => {
        let tokens = x.Key.split('/');
        return {
          boundaryId: tokens[2],
          functionId: tokens[3],
        };
      });
      if (docs.IsTruncated) {
        let lastItem = ctx.all_functions[ctx.all_functions.length - 1];
        ctx.result.next = Buffer.from(`${lastItem.boundaryId}/${lastItem.functionId}`, 'utf8').toString('hex');
      }
      if (
        options.next &&
        ctx.all_functions.length > 0 &&
        options.next === `${ctx.all_functions[0].boundaryId}/${ctx.all_functions[0].functionId}`
      ) {
        ctx.all_functions.shift();
      }
      return cb();
    });
  }
}
