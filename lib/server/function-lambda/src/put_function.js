const Assert = require('assert');
const Async = require('async');
const { Common } = require('@5qtrs/runtime-common');
const Constants = require('@5qtrs/constants');
import { create_function_worker as Worker } from './create_function_worker';

const Semver = require('semver');
const create_error = require('http-errors');
const Crypto = require('crypto');
const Superagent = require('superagent');
const Cron = require('cron-parser');
const Moment = require('moment-timezone');
const { stringify } = require('@5qtrs/json-stable');
const { serialize, update } = require('@5qtrs/key-value');
const Tags = require('@5qtrs/function-tags');

const { create_build_error_response, save_build_status } = require('./build_status');

const runtime_mapping = {
  '12.22.9': 'nodejs12.x',
  '14.18.3': 'nodejs14.x',
  '16.14.0': 'nodejs16.x',
};

const runtime_versions = Object.keys(runtime_mapping);
const default_node_runtime = process.env.LAMBDA_DEFAULT_NODE_RUNTIME || 'nodejs14.x';
const empty_hash = hash_object({});
const empty_array_hash = hash_object([]);

// The layers.json is a snapshot of the available AWS Lambda Layers
// published to CDN from the fusebit/everynode project on GitHub
// Take a new snapshot with
// curl https://cdn.fusebit.io/everynode/layers.json -o layers.json
let custom_runtime_layers = require('./layers.json')[process.env.AWS_REGION];
let custom_runtime_versions = custom_runtime_layers && Object.keys(custom_runtime_layers);

async function getRuntimeLayers() {
  try {
    const response = await Superagent.get('https://cdn.fusebit.io/everynode/layers.json');
    if (
      response.body &&
      response.body[process.env.AWS_REGION] &&
      Object.keys(response.body[process.env.AWS_REGION]).length > 0
    ) {
      custom_runtime_layers = response.body[process.env.AWS_REGION];
      custom_runtime_versions = Object.keys(custom_runtime_layers);
    }
  } catch (e) {
    console.log('ERROR GETTING NODE.JS RUNTIME LAYERS FROM CDN', e.stack || e.message || e);
  }
}
getRuntimeLayers();
setInterval(getRuntimeLayers, 3600 * 1000).unref(); // refresh layer catalog every hour

export function custom_layers_health() {
  if (!custom_runtime_layers) {
    throw new Error(`No custom Node.js AWS Lambda layers for region ${process.env.AWS_REGION} exist.`);
  }
}

export function put_function(req, res, next) {
  if (!req.body.nodejs) {
    return next(create_error(400, 'The `nodejs` body parameter is missing.'));
  }
  if (!req.body.nodejs.files) {
    return next(create_error(400, 'The `nodejs.files` body parameter is missing.'));
  }
  if (req.body.lambda && req.body.lambda.memory_size) {
    req.body.lambda.memorySize = req.body.lambda.memory_size;
    delete req.body.lambda.memory_size;
  }

  // Remove any runtime-generated values in the body, such as tags from a previous GET.
  delete req.body.runtime;

  if (req.body.subscriptionId !== undefined && req.body.subscriptionId !== req.params.subscriptionId) {
    const message = [
      `The subscriptionId in the body '${req.body.subscriptionId}'`,
      `does not match the subscriptionId in the URL '${req.params.subscriptionId}'`,
    ].join(' ');
    return next(create_error(400, message));
  }

  if (req.body.boundaryId !== undefined && req.body.boundaryId !== req.params.boundaryId) {
    const message = [
      `The boundaryId in the body '${req.body.boundaryId}'`,
      `does not match the boundaryId in the URL '${req.params.boundaryId}'`,
    ].join(' ');
    return next(create_error(400, message));
  }

  if (req.body.id !== undefined && req.body.id !== req.params.functionId) {
    const message = [
      `The id in the body '${req.body.id}'`,
      `does not match the functionId in the URL '${req.params.functionId}'`,
    ].join(' ');
    return next(create_error(400, message));
  }

  // The order we want to respect is: compute, computeSettings, lambda. This is only until lambda is fully deprecated.
  // This ensures that old versions of the editor do not clobber compute/computeSettings with default lambda values because
  // it ignores compute
  const ignoreLambda =
    req.body.compute || (req.body.metadata && req.body.metadata.fusebit && req.body.metadata.fusebit.computeSettings);

  let options = {
    accountId: req.params.accountId,
    subscriptionId: req.params.subscriptionId,
    boundaryId: req.params.boundaryId,
    functionId: req.params.functionId, // stripped on GET
    id: req.params.functionId,
    nodejs: req.body.nodejs,
    compute: ignoreLambda ? req.body.compute : req.body.lambda,
    computeSerialized: req.body.computeSerialized,
    configuration: req.body.configuration,
    configurationSerialized: req.body.configurationSerialized,
    schedule: req.body.schedule,
    scheduleSerialized: req.body.scheduleSerialized,
    metadata: req.body.metadata || {},
    location: Constants.get_function_location(
      req,
      req.params.subscriptionId,
      req.params.boundaryId,
      req.params.functionId
    ),
    security: req.body.security || {},
    routes: req.body.routes || [],
    fusebitEditor: req.body.fusebitEditor,

    // stripped on GET:
    internal: { subscription: req.subscription, forceRebuild: req.params.rebuild, versions: {} },
  };

  // Pass the authorization token from the header to the builders, so they can access resources on behalf of
  // the user during the build process.
  let auth = {
    keyStore: req.keyStore,
    agent: req.resolvedAgent,
  };

  return put_function_core(options, req.registry, auth, (e, r) => {
    if (e) {
      console.log(`LOGGING ERROR (put_function_core): `, e);
      return next(e.status ? e : create_error(500, `Error creating function: ${e.message}.`));
    }
    if (r.synchronous) {
      if (r.data) {
        // Build completed synchronously
        delete r.data.buildId;
        if (r.data.status === 'success') {
          res.status(200);
          return res.json(r.data);
        } else {
          let response = create_build_error_response(r.data);
          res.status(response.status);
          return res.json(response);
        }
      } else {
        // Nothing has changed in function specification, no build required
        res.status(204);
        return res.end();
      }
    } else {
      // Build has started and will complete asynchronously
      res.status(201);
      return res.json(r.data);
    }
  });
}

function put_function_core(options, registry, auth, cb) {
  Assert.ok(options);
  Assert.equal(typeof options.subscriptionId, 'string', 'options.subscriptionId must be specified');
  Assert.equal(typeof options.boundaryId, 'string', 'options.boundaryId must be specified');
  Assert.ok(options.boundaryId.match(Constants.valid_boundary_name), 'boundary name must be value');
  Assert.equal(typeof options.id, 'string', 'function name must be specified');
  Assert.ok(options.id.match(Constants.valid_function_name), 'function name must be valid');
  Assert.ok(options.nodejs, 'nodejs parameter must be specified');
  Assert.ok(typeof options.nodejs.files, 'files must be specified');
  Assert.equal(typeof options.nodejs.files, 'object', 'files must be a hash of file names to content');
  Assert.ok(
    options.nodejs.files['index.js'] || options.nodejs.encodedFiles['index.js'],
    'the index.js file must be specified'
  );
  for (let file_name in options.nodejs.files) {
    Assert.ok(
      typeof options.nodejs.files[file_name] === 'string' || typeof options.nodejs.files[file_name] === 'object',
      `file ${file_name} must be a string or object`
    );
  }
  for (let file_name in options.nodejs.encodedFiles) {
    Assert.ok(
      typeof options.nodejs.encodedFiles[file_name] === 'string' ||
        typeof options.nodejs.encodedFiles[file_name] === 'object',
      `file ${file_name} must be a string or object`
    );
  }
  Assert.ok(!options.compute || typeof options.compute === 'object', 'compute, if present, must be an object');
  Assert.ok(
    !options.environment || typeof options.environment === 'object',
    'environment, if present, must be an object'
  );

  let initial_build_status = {
    status: 'pending',
    subscriptionId: options.subscriptionId,
    boundaryId: options.boundaryId,
    functionId: options.id,
    buildId: Math.floor(Math.random() * 999999999).toString(32),
    transitions: {
      pending: new Date().toISOString(),
    },
  };

  var ctx = {
    options,
    build_status: initial_build_status,
    authorization: auth,
    registry,
  };

  return Async.series(
    [
      (cb) => get_existing_function_spec(ctx, cb),
      (cb) => resolve_settings(ctx, cb),
      (cb) => resolve_package_json(ctx, cb),
      (cb) => compute_build_plan(ctx, cb),
      // (cb) => {
      //   console.log('BUILD PLAN', ctx.options.internal);
      //   cb();
      // },
      (cb) => refresh_options_for_plan(ctx, cb),
      (cb) => save_function_build_status(ctx, cb),
      (cb) => save_function_build_request(ctx, cb),
      (cb) =>
        run_build(ctx, (e, d) => {
          ctx.result = d;
          cb(e);
        }),
    ],
    (e) => cb(e, ctx.result)
  );
  // TODO clean up after failed create
}

function refresh_options_for_plan(ctx, cb) {
  const build_plan = ctx.options.internal.build_plan;
  if (build_plan === 'full_build' || build_plan === 'partial_build') {
    // When rebuilding the binary, update the api version.
    ctx.options.internal.versions.api = process.env.API_STACK_VERSION;
  }

  return cb();
}

function is_build_async(ctx) {
  return ctx.options.internal.build_plan === 'full_build';
}

function save_function_build_status(ctx, cb) {
  if (!is_build_async(ctx)) {
    // No async build will be happening, do not save build status in S3
    return cb();
  }

  return save_build_status(ctx.build_status, cb);
}

function compute_build_plan(ctx, cb) {
  // This will compute ctx.options.internal.hashes and set ctx.options.internal.build_plan as follows:
  // 1. full_build (async): ensure all missing modules are built and stored in S3; or using custom runtime layer
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

  // It will also determine the SQS operations that need to be performed to support tasks and set ctx.options.internal.task_plan as follows:
  // 1. update (async): SQS queues to support tasks need to be created/deleted
  // 2. none (sync): no changes in SQS queues needed

  // Logical build plan execution paths are as follows:
  // ((([ full_build ] partial_build) | configuration_update) metadata_update) | none

  ctx.options.internal.hashes = {};

  // Compute hashes
  ctx.options.internal.hashes.code = hash_object({
    files: ctx.options.nodejs.files,
    encodedFiles: ctx.options.nodejs.encodedFiles,
  });
  ctx.options.internal.hashes.compute = hash_object(ctx.options.compute);
  ctx.options.internal.hashes.runtime = hash_object({ runtime: ctx.options.compute.runtime });
  ctx.options.internal.hashes.dependencies = hash_object(ctx.options.internal.dependencies);
  ctx.options.internal.hashes.configuration = hash_object(ctx.options.configuration);
  ctx.options.internal.hashes.metadata = hash_object(ctx.options.metadata);
  ctx.options.internal.hashes.schedule = hash_object(ctx.options.schedule);
  ctx.options.internal.hashes.security = hash_object({ security: ctx.options.security });
  ctx.options.internal.hashes.fusebitEditor = hash_object({ fusebitEditor: ctx.options.fusebitEditor });
  ctx.options.internal.hashes.serialized = hash_object({
    compute: ctx.options.computeSerialized,
    xonfiguration: ctx.options.configurationSerialized,
    schedule: ctx.options.scheduleSerialized,
  });
  ctx.options.internal.hashes.routes = hash_object(ctx.options.routes);
  ctx.options.internal.hashes.tasks = hash_object(
    ctx.options.routes
      .filter((r) => !!r.task) // pick only task scheduling routes
      .map((r) => r.path) // the only param that affects SQS configuration is the route path
      .sort()
  );

  // Determine build plan

  return Async.series(
    [(cb) => determine_dependencies_available(ctx, cb), (cb) => compute_build_plan_core(ctx, cb)],
    cb
  );
}

function resolve_settings(ctx, cb) {
  ctx.options.internal.existing.metadata = ctx.options.internal.existing.metadata || {};
  ctx.options.internal.existing.metadata.fusebit = ctx.options.internal.existing.metadata.fusebit || {};

  // hack to deal with runtime settings which we hide from the user
  let runtime = undefined;
  if (ctx.options.compute) {
    runtime = ctx.options.compute.runtime;
    ctx.options.compute.runtime = undefined;
  }

  // First, resolve settings between stuctured values and the serialized version
  resolve_settings_core(ctx, 'compute', 'computeSettings');
  resolve_settings_core(ctx, 'configuration', 'applicationSettings');
  resolve_settings_core(ctx, 'schedule', 'cronSettings');

  // Second, handle default values that need to be set if they haven't been already
  ctx.options.compute = ctx.options.compute || {};
  ctx.options.compute.memorySize =
    +ctx.options.compute.memorySize || +process.env.LAMBDA_USER_FUNCTION_MEMORY_SIZE || 128;
  ctx.options.compute.timeout = +ctx.options.compute.timeout || +process.env.LAMBDBA_USER_FUNCTION_TIMEOUT || 30;

  const isStaticIpAvailable = ctx.options.internal.subscription?.flags?.staticIp
    ? ctx.options.internal.subscription.flags.staticIp === 'true'
    : false;

  const requestedStaticIp = ctx.options.compute.staticIp === true || ctx.options.compute.staticIp === 'true';

  if (requestedStaticIp && !isStaticIpAvailable) {
    return cb(create_error(400, "Static IP feature requested for a subscription that doesn't have access to it."));
  }

  ctx.options.compute.staticIp = requestedStaticIp;

  const updatedWithDefaults = update(ctx.options.computeSerialized, { values: ctx.options.compute });
  ctx.options.computeSerialized = updatedWithDefaults.serialized;

  ctx.options.compute.runtime = runtime || process.env.LAMBDA_DEFAULT_NODE_RUNTIME;

  ctx.options.schedule = ctx.options.schedule || {};
  ctx.options.configuration = ctx.options.configuration || {};

  // Validate resolved cron settings
  for (let p in ctx.options.schedule) {
    if (p !== 'cron' && p !== 'timezone') {
      return cb(create_error(400, `Unexpected CRON setting '${p}'. Only 'cron' and 'timezone' are allowed`));
    }
  }
  if (ctx.options.schedule.cron) {
    try {
      Cron.parseExpression(ctx.options.schedule.cron);
    } catch (_) {
      return cb(
        create_error(
          400,
          "The value of 'cron' parameter must be a valid CRON expression. Check https://crontab.guru/ for reference"
        )
      );
    }
  } else if (ctx.options.schedule.timezone) {
    return cb(
      create_error(400, "The 'timezone' parameter can only be specified if the 'cron' parameter is also specified")
    );
  }
  if (ctx.options.schedule.timezone && !Moment.tz.zone(ctx.options.schedule.timezone)) {
    return cb(
      create_error(
        400,
        "The value of 'timezone' parameter must be a valid timezone identifier. Check https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for reference"
      )
    );
  }

  // Ensure function permissions are a subset of caller's
  const requestedPermissions = [];
  // Collect requested permissions from function level and all the routes
  try {
    // Compile permissions so that any {{}} variables are resolved
    const tags = Tags.Constants.convert_spec_to_tags(ctx.options);
    if (ctx.options.security.functionPermissions) {
      requestedPermissions.push(JSON.parse(Constants.getFunctionPermissions(tags)));
    }
    if (ctx.options.routes) {
      const routes = JSON.parse(Constants.getFunctionRoutes(tags));
      routes.forEach((route) => {
        if (route.security && route.security.functionPermissions) {
          requestedPermissions.push(route.security.functionPermissions);
        }
      });
    }
  } catch (e) {
    return cb(create_error(400, `Unable to parse function permissions: ${e.message}`));
  }
  // Validate requested permissions are a subset of the current authorized entity
  Promise.all(requestedPermissions.map((permissions) => ctx.authorization.agent.checkPermissionSubset(permissions)))
    .then(() => cb())
    .catch((e) =>
      cb(create_error(400, `Requested function permissions cannot exceed caller's permissions: ${e.message}`))
    );
}

function resolve_settings_core(ctx, key, metadataKey) {
  const serializedKey = `${key}Serialized`;
  let previousSerialized =
    ctx.options.internal.existing[serializedKey] ||
    ctx.options.internal.existing.metadata.fusebit[metadataKey] ||
    serialize(ctx.options.internal.existing[key] || {});

  let currentSerialized = ctx.options[serializedKey];
  if (currentSerialized === undefined && ctx.options.metadata && ctx.options.metadata.fusebit) {
    currentSerialized = ctx.options.metadata.fusebit[metadataKey];
  }

  if (previousSerialized === undefined) {
    previousSerialized = currentSerialized || '';
  }

  const updated = update(previousSerialized, {
    values: ctx.options[key],
    serialized: currentSerialized,
  });

  ctx.options[key] = updated.values;
  ctx.options[serializedKey] = updated.serialized;

  if (ctx.options.metadata && ctx.options.metadata.fusebit) {
    delete ctx.options.metadata.fusebit[metadataKey];
  }
}

function resolve_package_json(ctx, cb) {
  let package_json = ctx.options.nodejs.files['package.json'];
  if (typeof package_json === 'string') {
    try {
      package_json = JSON.parse(package_json);
      Assert.ok(package_json && typeof package_json === 'object');
    } catch (_) {
      return cb(create_error(400, 'The package.json file cannot be parsed as a JSON object.'));
    }
  }

  if (package_json && package_json.engines && typeof package_json.engines.node === 'string') {
    try {
      let best_runtime_match = Semver.maxSatisfying(runtime_versions, package_json.engines.node);
      ctx.options.compute.runtime = runtime_mapping[best_runtime_match];
      if (!ctx.options.compute.runtime) {
        // If none of the Node.js versions that AWS Lambda provides out of the box satisfy
        // the engine requirement, check if one of the custom runtime layers does
        best_runtime_match =
          custom_runtime_versions && Semver.maxSatisfying(custom_runtime_versions, package_json.engines.node);
        if (best_runtime_match) {
          ctx.options.compute.runtime = `provided:${custom_runtime_layers[best_runtime_match]}`;
        }
        if (!ctx.options.compute.runtime) {
          throw new Error('Cannot find matching Node version');
        }
      }
    } catch (_) {
      return cb(
        create_error(
          400,
          `Unable to find Node.js runtime version matching the "${
            package_json.engines.node
          }" requirement. Supported versions are: ${runtime_versions.join(', ')}${
            custom_runtime_versions ? ` and ${custom_runtime_versions.join(', ')}.` : `.`
          }`
        )
      );
    }
  } else {
    ctx.options.compute.runtime = default_node_runtime;
  }

  ctx.options.internal.dependencies = (package_json && package_json.dependencies) || {};

  cb();
}

function hash_object(o) {
  return Crypto.createHash('md5').update(stringify(o)).digest('base64');
}

function compute_build_plan_core(ctx, cb) {
  const hashes = ctx.options.internal.hashes;
  const existingHashes = ctx.options.internal.existing.internal.hashes;
  // Determine if this is a new function
  if (Object.keys(existingHashes).length === 0) {
    set_new_function();
  }

  // Determine TASK update plan
  if (hashes.tasks === existingHashes.tasks) {
    // Task scheduling routes have not changed
    set_task('none');
  } else if (hashes.tasks === empty_array_hash && !existingHashes.tasks) {
    // Update of a function that was last saved before the tasks feature
    // in which no new task routes are added
    set_task('none');
  } else {
    // Task scheduling routes have changed
    set_task('update');
  }

  // Determine CRON update plan
  if (hashes.schedule === existingHashes.schedule) {
    // CRON schedule has not changed or function is not a cron job
    set_cron('none');
  } else if (hashes.schedule === empty_hash && (existingHashes.schedule === empty_hash || !existingHashes.schedule)) {
    // Function is not a cron job
    set_cron('none');
  } else if (hashes.schedule === empty_hash) {
    // Function has its CRON status removed
    set_cron('cancel');
  } else if (existingHashes.schedule === empty_hash || !existingHashes.schedule) {
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

  // Any runtime transitions that involve custom layers take a long time - go async
  if (
    ctx.options.compute.runtime.indexOf('provided:') === 0 ||
    ctx.options.internal.existing.compute?.runtime.indexOf('provided:') === 0
  ) {
    return set_build('full_build');
  }

  // Attaching a lambda to a VPC for staticIp is slow; if the function has no dependencies and
  // staticIp is set on first creation, or if the value is changing, treat this as an asynchronous build.
  if (
    (ctx.options.compute.staticIp && !ctx.options.internal.existing.compute) ||
    (ctx.options.internal.existing.compute &&
      ctx.options.compute.staticIp != ctx.options.internal.existing.compute.staticIp)
  ) {
    return set_build('full_build');
  }

  if (hashes.runtime !== existingHashes.runtime) {
    // Runtime has changed, but all dependencies for the new runtime are available in S3.
    return set_build('partial_build');
  }

  if (hashes.dependencies !== existingHashes.dependencies) {
    // Dependencies have changed, but all are available in S3.
    return set_build('partial_build');
  }

  if (hashes.code !== existingHashes.code) {
    // Code has changed, dependencies remain unchanged.
    return set_build('partial_build');
  }

  if (hashes.configuration !== existingHashes.configuration) {
    // Configuration has changed, code/dependencies/runtime has not
    return set_build('configuration_update');
  }

  if (hashes.serialized !== existingHashes.serialized) {
    // Configuration has changed, code/dependencies/runtime has not
    return set_build('configuration_update');
  }

  if (ctx.options.internal.cron_plan !== 'none') {
    // CRON schedule has changed
    return set_build('configuration_update');
  }

  if (hashes.security !== existingHashes.security) {
    // Only security details have changed, no need to touch the function.
    return set_build('metadata_update');
  }

  if (hashes.routes !== existingHashes.routes) {
    // Only route details have changed, no need to touch the function.
    return set_build('metadata_update');
  }

  if (hashes.fusebitEditor !== existingHashes.fusebitEditor) {
    // Only fusebitEditor details have changed, no need to touch the function.
    return set_build('metadata_update');
  }

  if (hashes.metadata !== existingHashes.metadata) {
    // Only metadata has changed, no need to touch the function.
    return set_build('metadata_update');
  }

  return set_build('none');

  function set_cron(cron) {
    ctx.options.internal.cron_plan = cron;
  }

  function set_task(task) {
    ctx.options.internal.task_plan = task;
  }

  function set_build(build) {
    ctx.options.internal.build_plan = build;
    return cb();
  }

  function set_new_function() {
    ctx.options.internal.new_function = true;
  }
}

function determine_dependencies_available(ctx, cb) {
  const internal = ctx.options.internal;
  internal.missing_dependencies = {};

  if (
    !internal.forceRebuild &&
    internal.hashes.runtime === internal.existing.internal.hashes.runtime &&
    internal.hashes.dependencies === internal.existing.internal.hashes.dependencies
  ) {
    internal.resolved_dependencies = internal.existing.internal.resolved_dependencies || {};
    return cb();
  } else {
    internal.pending_dependencies = { ...internal.dependencies };
    internal.resolved_dependencies = {};
    // Otherwise, first fully resolve module versions using unpkg.com,
    // then check if they are available in S3.
    return Async.series(
      [
        (cb) => resolve_dependencies_from_fusebit(ctx, cb),
        (cb) => resolve_dependencies_from_unpkg(ctx, cb),
        (cb) => {
          if (internal.forceRebuild) {
            internal.missing_dependencies = internal.resolved_dependencies;
            cb();
          } else {
            check_dependencies_present_in_s3(ctx, cb);
          }
        },
      ],
      cb
    );
  }
}

function get_existing_function_spec(ctx, cb) {
  return Common.S3.getObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Constants.get_user_function_spec_key(ctx.options),
    },
    (e, d) => {
      if (e) {
        if (e.code === 'NoSuchKey' || e.code === 'NotFound') {
          ctx.options.internal.existing = { internal: { hashes: {} } };
          return cb();
        } else {
          return cb(e);
        }
      }
      try {
        ctx.options.internal.existing = JSON.parse(d.Body.toString('utf8')) || {};
        ctx.options.internal.existing.internal = ctx.options.internal.existing.internal || {};
        ctx.options.internal.existing.internal.hashes =
          ctx.options.internal.existing.internal.hashes || ctx.options.internal.existing.internal.new_metadata || {};

        // Use the version from the last build, or initialize with the current version.
        ctx.options.internal.versions = ctx.options.internal.existing.internal.versions || {
          api: process.env.API_STACK_VERSION,
        };

        // Handle legacy functions with old style metadata instead of hashes object
        delete ctx.options.internal.existing.internal.new_metadata;
        delete ctx.options.internal.existing.internal.existing_metadata;
        for (const key of Object.keys(ctx.options.internal.existing.internal.hashes)) {
          if (key.indexOf('_hash') !== -1) {
            ctx.options.internal.existing.internal.hashes[key.replace('_hash', '')] =
              ctx.options.internal.existing.internal.hashes[key];
            delete ctx.options.internal.existing.internal.hashes[key];
          }
        }
      } catch (e) {
        return cb(e);
      }
      return cb();
    }
  );
}

async function resolve_dependencies_from_fusebit(ctx, cb) {
  // Acquire registry config
  const cfg = await ctx.registry.configGet();

  const matches = Object.keys(ctx.options.internal.pending_dependencies).filter((name) => {
    const parts = name.split('/');
    return parts.length == 2 && cfg.scopes.indexOf(parts[0]) >= 0;
  });

  // Loop over ctx.options.internal.dependencies
  return Async.eachLimit(
    matches,
    +process.env.LAMBDA_UNPKG_CONCURRENT_REQUEST_LIMIT || 5,
    (name, cb) => resolve_one_dependency(ctx, name, cb),
    cb
  );

  async function resolve_one_dependency(ctx, name, cb) {
    const semver = ctx.options.internal.pending_dependencies[name];
    // Remove from ctx.options.internal.dependencies (no matter what, so it doesn't get passed downstream)
    delete ctx.options.internal.pending_dependencies[name];

    try {
      // Query for the package/version that matches the semver
      const version = await ctx.registry.semverGet(name, semver);

      if (!version) {
        return cb(create_error(400, `Unable to fully resolve module version for ${name}@${semver} from Fusebit`));
      }

      ctx.options.internal.resolved_dependencies[name] = { registry: ctx.registry.name(), version };
      return cb();
    } catch (err) {
      return cb(
        create_error(400, `Unable to fully resolve module version for ${name}@${semver} from Fusebit: ${err.message}`)
      );
    }
  }
}

export async function resolve_one_external_dependency(ctx, name, cb) {
  const unpkg = `https://unpkg.com/${name}@${ctx.options.internal.pending_dependencies[name]}/package.json`;
  const jsdelvr = `https://cdn.jsdelivr.net/npm/${name}@${ctx.options.internal.pending_dependencies[name]}/package.json`;
  const cdns = [jsdelvr, unpkg].sort(() => Math.random() - 0.5);
  const deadline = (+process.env.LAMBDA_UNPKG_TIMEOUT || 10000) * 1000000;
  const response = deadline / cdns.length;

  const errors = {};
  let remainingTime = deadline;

  for (const cdn of cdns) {
    const startTime = process.hrtime.bigint();
    try {
      const res = await Superagent.get(cdn).timeout({
        deadline: remainingTime / 1000000,
        response: Math.min(response, remainingTime) / 1000000,
      });

      if (res.body && typeof res.body.version === 'string') {
        ctx.options.internal.resolved_dependencies[name] = {
          registry: Constants.MODULE_PUBLIC_REGISTRY,
          version: res.body.version,
        };
        return cb();
      }
    } catch (e) {
      errors[cdn] = e;
      const endTime = process.hrtime.bigint();
      remainingTime -= Number(endTime - startTime);
      if (remainingTime <= 0) {
        break;
      }
    }
  }

  const errorMessage = Object.keys(errors)
    .map(
      (errorCdn) =>
        `Unable to fully resolve module version for ${name}@${ctx.options.internal.pending_dependencies[name]} from ${errorCdn}: ${errors[errorCdn].message}`
    )
    .join('\n');
  return cb(create_error(400, errorMessage));
}

function resolve_dependencies_from_unpkg(ctx, cb) {
  return Async.eachLimit(
    Object.keys(ctx.options.internal.pending_dependencies),
    +process.env.LAMBDA_UNPKG_CONCURRENT_REQUEST_LIMIT || 5,
    (name, cb) => resolve_one_external_dependency(ctx, name, cb),
    cb
  );
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
        Key: Constants.get_module_metadata_key(
          ctx.options.compute.runtime,
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
              `Unable to determine availability of module ${name}@${ctx.options.internal.resolved_dependencies[name].version} for runtime ${ctx.options.compute.runtime}: ${e.error}`
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

        if (!process.env.LAMBDA_ALWAYS_RETRY && d.Body.backoff && d.Body.backoff > Date.now()) {
          // Module failed a build before and is still in quarantine
          return cb(
            create_error(
              429,
              `Module ${name}@${ctx.options.internal.resolved_dependencies[name].version} for runtime ${
                ctx.options.compute.runtime
              } failed to build previously and another attempt is delayed until ${new Date(
                +d.Body.backoff
              ).toUTCString()}.`
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

function run_build(ctx, cb) {
  // TODO: implement the worker as an event-based Lambda that is triggered here

  // This logic is executed asynchronously with the initiating HTTP request when the `build_plan`
  // is `full_build` or when the `task_plan` is `update`. Otherwise, it is executed synchronously.

  if (is_build_async(ctx)) {
    process.nextTick(() => Worker(ctx.build_status, ctx.registry, ctx.authorization));
    return cb(null, { synchronous: false, data: ctx.build_status });
  } else if (ctx.options.internal.build_plan === 'none') {
    return cb(null, { synchronous: true, data: null });
  } else {
    // All other build plans execute synchronously with the HTTP request
    return Worker(ctx.build_status, ctx.registry, ctx.authorization, (e, d) =>
      e ? cb(e) : cb(null, { synchronous: true, data: d })
    );
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
      Key: Constants.get_user_function_build_request_key(ctx.build_status),
      Body: JSON.stringify(ctx.options),
      ContentType: 'application/json',
    },
    (e) => (e ? cb(e) : cb())
  );
}

export async function clear_built_module(name, spec) {
  return Promise.all(
    Object.values(runtime_mapping).map(async (runtime) => {
      try {
        await Common.S3.deleteObject({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: Constants.get_module_metadata_key(runtime, name, spec),
        }).promise();
      } catch (_) {}
    })
  );
}
