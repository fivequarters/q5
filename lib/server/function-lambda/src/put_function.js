const Assert = require('assert');
const Async = require('async');
const Common = require('./common');
const Worker = require('./create_function_worker');
const Semver = require('semver');
const create_error = require('http-errors');
const Crypto = require('crypto');
const Superagent = require('superagent');
const Cron = require('cron-parser');

const runtime_mapping = {
  '4.3.0': 'nodejs4.3',
  '6.10.0': 'nodejs6.10',
  '8.10.0': 'nodejs8.10',
};
const runtime_versions = Object.keys(runtime_mapping);
const default_node_runtime = process.env.LAMBDA_DEFAULT_NODE_RUNTIME || 'nodejs8.10';
const empty_hash = hash_object({});

module.exports = function lambda_put_function(req, res, next) {
  if (!req.body.nodejs) {
    return next(create_error(400, 'The `nodejs` body parameter is missing.'));
  }
  if (req.body.schedule) {
    try {
      Cron.parseExpression(req.body.schedule.cron);
    } catch (_) {
      return next(
        create_error(
          400,
          'The value of `schedule.cron` body parameter must be a valid CRON expression. Check https://crontab.guru/ for reference.'
        )
      );
    }
    try {
      Cron.parseExpression(req.body.schedule.cron, { tz: req.body.schedule.timezone || 'UTC' });
    } catch (_) {
      return next(
        create_error(
          400,
          'The value of `schedule.timezone` body parameter must be a valid timezone identifier. Check https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for reference.'
        )
      );
    }
  }

  let package_json = req.body.nodejs.files['package.json'];
  if (typeof package_json === 'string') {
    try {
      package_json = JSON.parse(package_json);
      Assert.ok(package_json && typeof package_json === 'object');
    } catch (_) {
      return next(create_error(400, 'The package.json file cannot be parsed as a JSON object.'));
    }
  }
  let options = {
    subscriptionId: req.params.subscriptionId,
    boundaryId: req.params.boundaryId,
    functionId: req.params.functionId, // stripped on GET
    id: req.params.functionId,
    nodejs: req.body.nodejs,
    lambda: req.body.lambda || {},
    configuration: req.body.configuration || {},
    metadata: req.body.metadata || {},
    schedule: req.body.schedule || {},
    location: Common.get_function_location(
      req,
      req.params.subscriptionId,
      req.params.boundaryId,
      req.params.functionId
    ),
    // stripped on GET:
    internal: {
      dependencies: (package_json && package_json.dependencies) || {},
    },
  };

  // TODO tjanczuk, instead of adding a synthetic dependency on the `ws` module,
  // consider bundling the module as an additional file in the deployment package.
  if (!options.internal.dependencies['ws']) {
    options.internal.dependencies['ws'] = '6.1.3';
  }

  if (package_json && package_json.engines && typeof package_json.engines.node === 'string') {
    try {
      let best_runtime_match = Semver.maxSatisfying(runtime_versions, package_json.engines.node);
      options.lambda.runtime = runtime_mapping[best_runtime_match];
    } catch (_) {
      return next(
        create_error(
          400,
          `Unable to find Node.js runtime version matching the "${
            package_json.engines.node
          }" requirement. Supported versions are: ${runtime_versions.join(', ')}.`
        )
      );
    }
  } else {
    options.lambda.runtime = default_node_runtime;
  }

  return module.exports.core(options, (e, r) => {
    if (e) return next(e.status ? e : create_error(500, `Error creating function: ${e.message}.`));
    if (r.synchronous) {
      if (r.data) {
        // Build completed synchronously
        res.status(200);
        delete r.data.buildId;
        return res.json(r.data);
      } else {
        // Nothing has changed in function specification, no build required
        res.status(204);
        return res.end();
      }
    } else {
      // Build has started and will complete asynchronously
      res.status(201);
      delete r.data.buildId;
      return res.json(r.data);
    }
  });
};

module.exports.core = function lambda_put_function_core(options, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscriptionId must be specified');
  Assert.equal(typeof options.boundaryId, 'string', 'options.boundaryId must be specified');
  Assert.ok(options.boundaryId.match(Common.valid_boundary_name), 'boundary name must be value');
  Assert.equal(typeof options.id, 'string', 'function name must be specified');
  Assert.ok(options.id.match(Common.valid_function_name), 'function name must be valid');
  Assert.ok(options.nodejs, 'nodejs parameter must be specified');
  Assert.ok(typeof options.nodejs.files, 'files must be specified');
  Assert.equal(typeof options.nodejs.files, 'object', 'files must be a hash of file names to content');
  Assert.ok(options.nodejs.files['index.js'], 'the index.js file must be specified');
  for (var file_name in options.nodejs.files)
    Assert.ok(
      typeof options.nodejs.files[file_name] === 'string' || typeof options.nodejs.files[file_name] === 'object',
      `file ${file_name} must be a string or object`
    );
  Assert.ok(!options.lambda || typeof options.lambda === 'object', 'lambda, if present, must be an object');
  Assert.ok(
    !options.environment || typeof options.environment === 'object',
    'environment, if present, must be an object'
  );

  options.lambda = options.lambda || {};
  options.lambda.runtime = options.lambda.runtime || process.env.LAMBDA_DEFAULT_NODE_RUNTIME;
  options.lambda.memory_size = options.lambda.memory_size || +process.env.LAMBDA_USER_FUNCTION_MEMORY_SIZE || 128;
  options.lambda.timeout = options.lambda.timeout || +process.env.LAMBDBA_USER_FUNCTION_TIMEOUT || 30;

  let initial_build_status = {
    status: 'pending',
    subscriptionId: options.subscriptionId,
    boundaryId: options.boundaryId,
    functionId: options.id,
    id: Math.floor(Math.random() * 999999999).toString(32),
    transitions: {
      pending: new Date().toString(),
    },
  };

  options.buildId = initial_build_status.id; // stripped on GET
  initial_build_status.buildId = initial_build_status.id; // stripped on GET

  var ctx = {
    options,
    build_status: initial_build_status,
  };

  return Async.series(
    [
      cb => get_existing_function_metadata(ctx, cb),
      cb => compute_build_plan(ctx, cb),
      // (cb) => { console.log('BUILD PLAN', ctx.options.internal); cb(); },
      cb => save_function_build_status(ctx, cb),
      cb => save_function_build_request(ctx, cb),
      cb =>
        run_build(ctx, (e, d) => {
          ctx.result = d;
          cb(e);
        }),
    ],
    e => cb(e, ctx.result)
  );
  // TODO clean up after failed create
};

function save_function_build_status(ctx, cb) {
  if (ctx.options.internal.build_plan !== 'full_build') {
    // No async buid will be happening, do not save build status in S3
    return cb();
  }

  return Common.save_function_build_status(ctx.build_status, cb);
}

function compute_build_plan(ctx, cb) {
  // This will compute ctx.options.internal.new_metadata and set ctx.options.internal.build_plan as follows:
  // 1. full_build (async): ensure all missing modules are built and stored in S3
  // 2. partial_build (sync): create deployment package of the function by pulling existing modules
  //    from S3 and replace or create the function
  // 3. configuration_update (sync): update configuration of existing Lambda function
  // 4. metadata_update (sync): update function spec in S3
  // 5. none (sync): no changes requested

  // It will also determine the CRON operation that needs to be performed and set ctx.options.internal.cron_plan as follows:
  // 1. cancel (sync): CRON job becomes a regular function
  // 2. update (sync): update schedule of existing cron job
  // 3. set (sync): schedule a function that became a cron job
  // 4. none (sync): do nothing

  // Logical build plan execution paths are as follows:
  // ((([ full_build ] partial_build) | configuration_update) metadata_update) | none

  ctx.options.internal.new_metadata = {};

  // Compute hashes
  ctx.options.internal.new_metadata.code_hash = hash_object(ctx.options.nodejs.files);
  ctx.options.internal.new_metadata.lambda_hash = hash_object(ctx.options.lambda);
  ctx.options.internal.new_metadata.runtime_hash = hash_object({ runtime: ctx.options.lambda.runtime });
  ctx.options.internal.new_metadata.dependencies_hash = hash_object(ctx.options.internal.dependencies);
  ctx.options.internal.new_metadata.configuration_hash = hash_object(ctx.options.configuration);
  ctx.options.internal.new_metadata.metadata_hash = hash_object(ctx.options.metadata);
  ctx.options.internal.new_metadata.schedule_hash = hash_object(ctx.options.schedule);

  // Determine build plan

  return Async.series([cb => determine_dependencies_available(ctx, cb), cb => compute_build_plan_core(ctx, cb)], cb);
}

function hash_object(o) {
  var hash = Crypto.createHash('md5');
  Object.keys(o)
    .sort()
    .forEach(prop => {
      hash.update(prop);
      hash.update(':');
      hash.update(typeof o[prop] === 'string' ? o[prop] : JSON.stringify(o[prop]));
      hash.update(':');
    });
  return hash.digest('base64');
}

function compute_build_plan_core(ctx, cb) {
  // Determine CRON update plan
  if (ctx.options.internal.new_metadata.schedule_hash === ctx.options.internal.existing_metadata.schedule_hash) {
    // CRON schedule has not changed or function is not a cron job
    set_cron('none');
  } else if (
    ctx.options.internal.new_metadata.schedule_hash === empty_hash &&
    !ctx.options.internal.existing_metadata.schedule_hash
  ) {
    // Function is not a cron job
    set_cron('none');
  } else if (ctx.options.internal.new_metadata.schedule_hash === empty_hash) {
    // Function has its CRON status removed
    set_cron('cancel');
  } else if (
    ctx.options.internal.existing_metadata.schedule_hash === empty_hash ||
    !ctx.options.internal.existing_metadata.schedule_hash
  ) {
    // Function was changed to a CRON job
    set_cron('set');
  } else {
    // CRON schedule has changed
    set_cron('update');
  }

  if (Object.keys(ctx.options.internal.missing_dependencies).length > 0) {
    // New dependencies must be built.
    return set_build('full_build');
  }

  if (ctx.options.internal.new_metadata.runtime_hash !== ctx.options.internal.existing_metadata.runtime_hash) {
    // Runtime has changed, but all dependencies for the new runtime are available in S3.
    return set_build('partial_build');
  }

  if (
    ctx.options.internal.new_metadata.dependencies_hash !== ctx.options.internal.existing_metadata.dependencies_hash
  ) {
    // Dependencies have changed, but all are available in S3.
    return set_build('partial_build');
  }

  if (ctx.options.internal.new_metadata.code_hash !== ctx.options.internal.existing_metadata.code_hash) {
    // Code has changed, dependencies remain unchanged.
    return set_build('partial_build');
  }

  if (
    ctx.options.internal.new_metadata.configuration_hash !== ctx.options.internal.existing_metadata.configuration_hash
  ) {
    // Configuration has changed, code/dependencies/runtime has not
    return set_build('configuration_update');
  }

  if (ctx.options.internal.cron_plan !== 'none') {
    // CRON schedule has changed
    return set_build('configuration_update');
  }

  if (ctx.options.internal.new_metadata.metadata_hash !== ctx.options.internal.existing_metadata.metadata_hash) {
    // Only metadata has changed, no need to touch the function.
    return set_build('metadata_update');
  }

  return set_build('none');

  function set_cron(cron) {
    ctx.options.internal.cron_plan = cron;
  }

  function set_build(build) {
    ctx.options.internal.build_plan = build;
    return cb();
  }
}

function determine_dependencies_available(ctx, cb) {
  ctx.options.internal.missing_dependencies = {};

  if (
    ctx.options.internal.new_metadata.runtime_hash === ctx.options.internal.existing_metadata.runtime_hash &&
    ctx.options.internal.new_metadata.dependencies_hash === ctx.options.internal.existing_metadata.dependencies_hash
  ) {
    // Neither Nodejs runtime or dependencies have changed, which means all
    // dependencies must still be available in S3

    return resolve_dependencies_from_current_function_spec(ctx, cb);
  } else {
    // Otherwise, first fully resolve module versions using unpkg.com,
    // then check if they are available in S3.
    return Async.series(
      [cb => resolve_dependencies_from_unpkg(ctx, cb), cb => check_dependencies_present_in_s3(ctx, cb)],
      cb
    );
  }
}

function resolve_dependencies_from_current_function_spec(ctx, cb) {
  // TODO consider storing resolved dependencies in another S3 document, otherwise we are
  // pulling the entire current function spec for every save operaration that does not change
  // modules
  return Common.S3.getObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_spec_key(ctx.options),
    },
    (e, d) => {
      if (e) return cb(e);
      try {
        d.Body = JSON.parse(d.Body.toString('utf8'));
      } catch (e) {
        return cb(e);
      }

      ctx.options.internal.resolved_dependencies = d.Body.internal.resolved_dependencies;

      return cb();
    }
  );
}

function resolve_dependencies_from_unpkg(ctx, cb) {
  ctx.options.internal.resolved_dependencies = {};

  return Async.eachLimit(
    Object.keys(ctx.options.internal.dependencies),
    +process.env.LAMBDA_UNPKG_CONCURRENT_REQUEST_LIMIT || 5,
    (name, cb) => resolve_one_dependency(ctx, name, cb),
    cb
  );

  function resolve_one_dependency(ctx, name, cb) {
    var url = `https://unpkg.com/${name}@${ctx.options.internal.dependencies[name]}/package.json`;
    return Superagent.get(url)
      .timeout(+process.env.LAMBDA_UNPKG_TIMEOUT || 10000)
      .then(res => {
        if (res.body && typeof res.body.version === 'string') {
          ctx.options.internal.resolved_dependencies[name] = res.body.version;
          return cb();
        }
        return cb(
          create_error(
            400,
            `Unable to fully resolve module version for ${name}@${ctx.options.internal.dependencies[name]} from ${url}`
          )
        );
      })
      .catch(err => {
        return cb(
          create_error(
            400,
            `Unable to fully resolve module version for ${name}@${
              ctx.options.internal.dependencies[name]
            } from ${url}: ${err.message}`
          )
        );
      });
  }
}

function check_dependencies_present_in_s3(ctx, cb) {
  ctx.options.internal.dependency_metadata = {};

  return Async.eachLimit(
    Object.keys(ctx.options.internal.resolved_dependencies),
    +process.env.LAMBDA_S3_MODULE_CHECK_CONCURRENT_REQUEST_LIMIT || 5,
    (name, cb) => check_one_dependency_present_in_s3(ctx, name, cb),
    cb
  );

  function check_one_dependency_present_in_s3(ctx, name, cb) {
    return Common.S3.getObject(
      {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: Common.get_module_metadata_key(
          ctx.options.lambda.runtime,
          name,
          ctx.options.internal.resolved_dependencies[name]
        ),
      },
      (e, d) => {
        if (e) {
          if (e.code === 'NoSuchKey' || e.code === 'NotFound') {
            // Module is not built and a build has not been attempted before
            ctx.options.internal.missing_dependencies[name] = {};
            return cb();
          }
          return cb(
            new Error(
              `Unable to determine availability of module ${name}@${
                ctx.options.internal.resolved_dependencies[name]
              } for runtime ${ctx.options.lambda.runtime}: ${e.error}`
            )
          );
        }
        try {
          d.Body = JSON.parse(d.Body);
        } catch (_) {
          d.Body = {};
        }
        if (d.Body.status === 'success') {
          // Module is available
          return cb();
        }
        if (d.Body.backoff && d.Body.backoff > Date.now()) {
          // Module failed a build before and is still in quarantine
          return cb(
            new Error(
              `Module ${name}@${ctx.options.internal.resolved_dependencies[name]} for runtime ${
                ctx.options.lambda.runtime
              } failed to build previously and another attempt is delayed until ${new Date(
                +d.Metadata.backoff
              ).toUTCString()}. Last error: ${d.Metadata.error}`
            )
          );
        }

        // Module failed a build before but is out of quarantine
        ctx.options.internal.missing_dependencies[name] = d.Body;
        return cb();
      }
    );
  }
}

function get_existing_function_metadata(ctx, cb) {
  return Common.S3.headObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_spec_key(ctx.options),
    },
    (e, d) => {
      if (e) {
        if (e.code === 'NoSuchKey' || e.code === 'NotFound') {
          ctx.options.internal.existing_metadata = {};
          return cb();
        } else return cb(e);
      }
      ctx.options.internal.existing_metadata = d.Metadata || {};
      return cb();
    }
  );
}

function run_build(ctx, cb) {
  // TODO: implement the worker as an event-based Lambda that is triggered here

  // This logic is executed asynchronously with the initiating HTTP request for full_build,
  // and synchronously for all other build plans.

  if (ctx.options.internal.build_plan === 'full_build') {
    process.nextTick(() => Worker(ctx.build_status));
    return cb(null, { synchronous: false, data: ctx.build_status });
  } else if (ctx.options.internal.build_plan === 'none') {
    return cb(null, { synchronous: true, data: null });
  } else {
    // All other build plans execute synchronously with the HTTP request
    return Worker(ctx.build_status, (e, d) => (e ? cb(e) : cb(null, { synchronous: true, data: d })));
  }
}

function save_function_build_request(ctx, cb) {
  if (ctx.options.internal.build_plan === 'none') {
    // No build will be happening, do not store build request in S3
    return cb();
  }

  return Common.S3.putObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_build_request_key(ctx.options),
      Body: JSON.stringify(ctx.options),
      ContentType: 'application/json',
    },
    e => (e ? cb(e) : cb())
  );
}
