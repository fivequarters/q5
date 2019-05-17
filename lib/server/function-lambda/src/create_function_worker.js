const Assert = require('assert');
const Async = require('async');
const Fs = require('fs');
const Path = require('path');
const Crypto = require('crypto');
const Common = require('./common');
const Cron = require('cron-parser');

// TODO: move this logic to a Lambda or other worker

const executor_js = Fs.readFileSync(Path.join(__dirname, '../lambda/executor/executor.js'), { encoding: 'utf8' });
const builder_version = JSON.parse(Fs.readFileSync(Path.join(__dirname, '../../../../package.json'), 'utf8')).version;
const builder_zip = Fs.readFileSync(Path.join(__dirname, 'builder.zip'));

module.exports = function create_function(status, cb) {
  Assert.ok(status);
  Assert.equal(typeof status.subscriptionId, 'string', 'subscriptionId must be specified');
  Assert.equal(typeof status.boundaryId, 'string', 'boundaryId must be specified');
  Assert.ok(status.boundaryId.match(Common.valid_boundary_name), 'boundary name must be valid');
  Assert.equal(typeof status.functionId, 'string', 'functionId must be specified');
  Assert.ok(status.functionId.match(Common.valid_function_name), 'function name must be valid');
  Assert.equal(typeof status.id, 'string', 'build id must be provided');

  transition_state('building');

  var ctx = { status };

  return Async.series(
    [
      // cb => {
      //   console.log('S1');
      //   cb();
      // },
      cb => get_build_request(ctx, cb), // any build plan
      // cb => {
      //   console.log('S2');
      //   cb();
      // },
      cb => save_function_build_status(ctx, cb), // any build plan
      // cb => {
      //   console.log('S3');
      //   cb();
      // },
      cb => create_signed_s3_urls(ctx, cb), // full_build or partial_build only
      // cb => {
      //   console.log('S4');
      //   cb();
      // },
      cb => compile_missing_dependencies(ctx, cb), // full_build only
      // cb => {
      //   console.log('S5');
      //   cb();
      // },
      cb => compile_deployment_package(ctx, cb), // full_build or partial_build only
      // cb => {
      //   console.log('S6');
      //   cb();
      // },
      cb => create_user_function(ctx, cb), // full_build or partial_build only
      // cb => {
      //   console.log('S7');
      //   cb();
      // },
      cb => update_cron(ctx, cb), // any updates to CRON status
      // cb => {
      //   console.log('S8');
      //   cb();
      // },
      cb => update_user_function_config(ctx, cb), // configuration_update only
      // cb => {
      //   console.log('S9');
      //   cb();
      // },
    ],
    e => {
      if (e) {
        transition_state('failed');
        status.error = e;
      } else {
        status.location = ctx.options.location;
        transition_state('success');
      }
      return Async.series(
        [
          cb => (e ? cb() : save_function_spec(ctx.options, cb)),
          cb => delete_build_request(ctx.status, cb),
          cb => save_function_build_status(ctx, cb),
        ],
        e => {
          if (e) console.error('FUNCTION BUILD FAILED', e);
          if (typeof cb === 'function') {
            cb(e, e ? null : status);
          }
        }
      );
    }
  );

  function transition_state(new_state) {
    status.status = new_state;
    status.transitions[new_state] = new Date().toString();
  }
};

function update_cron(ctx, cb) {
  let plan;
  switch (ctx.options.internal.cron_plan) {
    default:
      break;
    case 'cancel':
      plan = [cb => delete_cron(ctx, cb)];
      break;
    case 'set':
      plan = [cb => register_cron(ctx, cb), cb => enqueue_imminent_cron(ctx, cb)];
      break;
    case 'update':
      plan = [cb => delete_cron(ctx, cb), cb => register_cron(ctx, cb), cb => enqueue_imminent_cron(ctx, cb)];
      break;
  }

  return plan ? Async.series(plan, cb) : cb();
}

function delete_cron(ctx, cb) {
  return Common.S3.listObjectsV2(
    {
      Prefix: Common.get_cron_key_prefix(ctx.options),
    },
    (e, d) => {
      if (e) return cb(e);
      return Async.eachLimit(d.Contents || [], 5, (i, cb) => Common.S3.deleteObject({ Key: i.Key }, cb), cb);
    }
  );
}

function register_cron(ctx, cb) {
  return Common.S3.putObject(
    {
      Key: Common.get_cron_key(ctx.options),
    },
    cb
  );
}

function enqueue_imminent_cron(ctx, cb) {
  if (!process.env.CRON_QUEUE_URL) return cb();

  // Determine all executions due between now and the end of the current 10 minute period of the hour -
  // these are the executions that will be missed by by the scheduler Lambda
  let end = new Date(new Date().getTime() + 10 * 60000);
  end.setMinutes(Math.floor(end.getMinutes() / 10) * 10);
  end.setSeconds(0);
  end.setMilliseconds(0);

  let now = new Date();

  let cron = Cron.parseExpression(ctx.options.schedule.cron, {
    currentDate: now,
    endDate: end,
    tz: ctx.options.schedule.timezone || 'UTC',
  });

  let entries = [];
  for (let i = 0; i < +process.env.CRON_MAX_EXECUTIONS_PER_WINDOW || 120; i++) {
    // limit to max 10 executions in the imminent future
    let at;
    try {
      at = cron.next();
    } catch (_) {
      break;
    }
    entries.push({
      Id: at.getTime().toString(),
      DelaySeconds: Math.floor(Math.max(0, at.getTime() - now.getTime()) / 1000),
      MessageBody: JSON.stringify({
        key: Common.get_cron_key(ctx.options),
        subscriptionId: ctx.options.subscriptionId,
        boundaryId: ctx.options.boundaryId,
        functionId: ctx.options.functionId,
        cron: ctx.options.schedule.cron,
        timezone: ctx.options.schedule.timezone,
      }),
    });
  }
  // console.log('ENQUEUE ENTRIES', entries);
  if (entries.length > 0) {
    return schedule(cb);

    function schedule(cb) {
      if (entries.length === 0) return cb();
      return Common.SQS.sendMessageBatch(
        {
          QueueUrl: process.env.CRON_QUEUE_URL,
          Entries: entries.splice(0, 10),
        },
        (e, d) => {
          if (e) return cb(e);
          if (d.Failed && d.Failed.length > 0)
            return cb(new Error(`Failed to schedule ${d.Failed.length} imminent executions of the CRON job.`));
          return schedule(cb);
        }
      );
    }
  }

  return cb();
}

function save_function_build_status(ctx, cb) {
  if (ctx.options && ctx.options.internal && ctx.options.internal.build_plan !== 'full_build') {
    // No async build is happening, do not update build status in S3
    return cb();
  }

  return Common.save_function_build_status(ctx.status, cb);
}

function delete_build_request(options, cb) {
  return Common.S3.deleteObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_build_request_key(options),
    },
    e => (e ? cb(e) : cb())
  );
}

function get_build_request(ctx, cb) {
  return Common.S3.getObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_build_request_key(ctx.status),
    },
    (e, d) => {
      if (e) return cb(e);
      try {
        d.Body = JSON.parse(d.Body.toString('utf8'));
      } catch (e) {
        return cb(e);
      }
      ctx.options = d.Body;
      return cb();
    }
  );
}

function save_function_spec(options, cb) {
  return Common.S3.putObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: Common.get_user_function_spec_key(options),
      Body: JSON.stringify(options),
      ContentType: 'application/json',
      Metadata: options.internal.new_metadata,
    },
    e => (e ? cb(e) : cb())
  );
}

function create_user_function(ctx, cb) {
  if (ctx.options.internal.build_plan !== 'full_build' && ctx.options.internal.build_plan !== 'partial_build') {
    // No need for recreating the entire function
    return cb();
  }

  return Async.waterfall([cb => delete_user_function(ctx.options, cb), cb => create_user_function_impl(ctx, cb)], cb);
}

function delete_user_function(options, cb) {
  return Common.Lambda.deleteFunction(
    {
      FunctionName: Common.get_user_function_name(options),
    },
    e => (e && e.code !== 'ResourceNotFoundException' ? cb(e) : cb())
  );
}

const userFunctionLogsConfig = {
  Q5_LOGS_MAX_BUFFER: process.env.LOGS_MAX_BUFFER || '100',
  Q5_LOGS_BUFFER_INTERVAL: process.env.LOGS_BUFFER_INTERVAL || '100',
};

function create_user_function_impl(ctx, cb) {
  let variables = {};
  for (var k in ctx.options.configuration) {
    variables[k] = ctx.options.configuration[k];
  }
  for (var k in userFunctionLogsConfig) {
    variables[k] = userFunctionLogsConfig[k];
  }
  let create_function_params = {
    FunctionName: Common.get_user_function_name(ctx.options),
    Description: Common.get_user_function_description(ctx.options),
    Runtime: ctx.options.lambda.runtime,
    Handler: 'executor.execute',
    MemorySize: ctx.options.lambda.memory_size,
    Timeout: ctx.options.lambda.timeout,
    Environment: { Variables: variables },
    Code: {
      S3Bucket: process.env.AWS_S3_BUCKET,
      S3Key: ctx.options.internal.function_signed_url.key,
    },
    Role: process.env.LAMBDA_USER_FUNCTION_ROLE,
  };
  return Common.Lambda.createFunction(create_function_params, e => {
    cb(e);
  });
}

function update_user_function_config(ctx, cb) {
  if (ctx.options.internal.build_plan !== 'configuration_update') {
    // If a function is fully or partially built, configuration is set at that point.
    // Only in configuration_update build plan just the function config needs to be updated.
    return cb();
  }

  let update_function_params = {
    FunctionName: Common.get_user_function_name(ctx.options),
    MemorySize: ctx.options.lambda.memory_size,
    Timeout: ctx.options.lambda.timeout,
    Environment: { Variables: ctx.options.configuration },
  };

  return Common.Lambda.updateFunctionConfiguration(update_function_params, cb);
}

function create_signed_s3_urls(ctx, cb) {
  return Async.parallel(
    [cb => get_signed_s3_urls_for_modules(ctx, cb), cb => get_signed_s3_urls_for_function(ctx, cb)],
    cb
  );

  function get_signed_s3_urls_for_modules(ctx, cb) {
    if (ctx.options.internal.build_plan !== 'full_build' && ctx.options.internal.build_plan !== 'partial_build') {
      // No need for signed URLs because the function does not need to be build
      return cb();
    }

    ctx.options.internal.module_signed_urls = { put: {}, get: {} };

    return Async.each(
      Object.keys(ctx.options.internal.resolved_dependencies),
      (name, cb) => get_signed_s3_urls_for_module(name, ctx, cb),
      cb
    );
  }

  function get_signed_s3_urls_for_module(name, ctx, cb) {
    let s3_package_key = Common.get_module_key(
      ctx.options.lambda.runtime,
      name,
      ctx.options.internal.resolved_dependencies[name]
    );

    return Async.parallel(
      [
        cb => get_signed_s3_urls_for_module_put(s3_package_key, name, ctx, cb),
        cb => get_signed_s3_urls_for_module_get(s3_package_key, ctx, cb),
      ],
      cb
    );

    function get_signed_s3_urls_for_module_put(key, name, ctx, cb) {
      if (!ctx.options.internal.missing_dependencies[name]) {
        // The module does not need to be built, no need for a signed url for PUT
        return cb();
      }
      return Common.S3.getSignedUrl(
        'putObject',
        {
          Key: key,
          ContentType: 'application/zip',
        },
        (e, u) => {
          if (e) return cb(e);
          ctx.options.internal.module_signed_urls.put[name] = { key: s3_package_key, url: u };
          return cb();
        }
      );
    }

    function get_signed_s3_urls_for_module_get(key, ctx, cb) {
      return Common.S3.getSignedUrl(
        'getObject',
        {
          Key: key,
        },
        (e, u) => {
          if (e) return cb(e);
          ctx.options.internal.module_signed_urls.get[name] = { key: s3_package_key, url: u };
          return cb();
        }
      );
    }
  }

  function get_signed_s3_urls_for_function(ctx, cb) {
    let s3_package_key = Common.get_user_function_build_key(ctx.options);
    return Common.S3.getSignedUrl(
      'putObject',
      {
        Key: s3_package_key,
        ContentType: 'application/zip',
      },
      (e, u) => {
        if (e) return cb(e);
        ctx.options.internal.function_signed_url = { key: s3_package_key, url: u };
        return cb();
      }
    );
  }
}

function get_function_builder_description(options) {
  return `function-builder:${options.lambda.runtime}:${builder_version}`;
}

function get_module_builder_description(runtime, name) {
  return `module-builder:${runtime}:${name}:${builder_version}`;
}

function get_function_builder_name(options) {
  return Crypto.createHash('sha1')
    .update(get_function_builder_description(options))
    .digest('hex');
}

function get_module_builder_name(runtime, name) {
  return Crypto.createHash('sha1')
    .update(get_module_builder_description(runtime, name))
    .digest('hex');
}

function compile_missing_dependencies(ctx, cb) {
  return Async.eachLimit(
    Object.keys(ctx.options.internal.missing_dependencies || {}),
    +process.env.LAMBDA_MAX_CONCURRENT_MODULE_BUILD || 5,
    (name, cb) => compile_missing_dependency(name, ctx, cb),
    cb
  );
}

function compile_missing_dependency(name, ctx, cb) {
  var build_start = Date.now();

  // Construct module builder function invocation parameters
  let builder_invoke_params = {
    FunctionName: get_module_builder_name(ctx.options.lambda.runtime, name),
    Payload: JSON.stringify({
      name,
      version: ctx.options.internal.resolved_dependencies[name],
      put: ctx.options.internal.module_signed_urls.put[name],
    }),
    InvocationType: 'RequestResponse',
    LogType: 'Tail',
  };

  // This logic forces the module builder to be (re)created if LAMBDA_MODULE_BUILDER_FORCE_CREATE
  // is set, otherwise it lazily creates the module builder if needed.
  return +process.env.LAMBDA_MODULE_BUILDER_FORCE_CREATE
    ? create_module_builder_then_compile(true)
    : module_compile_pass(false);

  function create_module_builder_then_compile(delete_before_creating) {
    return Async.series(
      [
        cb => (delete_before_creating ? delete_module_builder(name, ctx, cb) : cb()),
        cb => create_module_builder(name, ctx, cb),
        cb => module_compile_pass(true),
      ],
      e => {
        if (e) return cb(e); // otherwise cb called from module_compile_pass(true)
      }
    );
  }

  function module_compile_pass(is_final) {
    return Common.Lambda.invoke(builder_invoke_params, (e, d) => {
      if (e) {
        if (e.code === 'ResourceNotFoundException' && !is_final) {
          return create_module_builder_then_compile(false);
        }
        return update_module_metadata_and_finish(e);
      }
      if (d.StatusCode !== 200 || d.FunctionError) {
        return update_module_metadata_and_finish(d);
      }
      return update_module_metadata_and_finish();
    });
  }

  function update_module_metadata_and_finish(build_error) {
    var new_metadata = ctx.options.internal.missing_dependencies[name] || {};
    new_metadata.completed = new Date().toUTCString();
    new_metadata.duration = Date.now() - build_start;
    if (build_error) {
      new_metadata.status = 'failure';
      new_metadata.failure_count = (new_metadata.failure_count || 0) + 1;
      new_metadata.backoff =
        Date.now() + (new_metadata.backoff_step || +process.env.LAMBDA_MODULE_BUILDER_INITIAL_BACKOFF || 120000);
      new_metadata.backoff_step = Math.floor(
        (new_metadata.backoff_step || +process.env.LAMBDA_MODULE_BUILDER_INITIAL_BACKOFF || 120000) *
          (+process.env.LAMBDA_MODULE_BUILDER_BACKOFF_RATIO || 1.2)
      );
      if (build_error.LogResult) {
        build_error.LogResult = new Buffer(build_error.LogResult, 'base64').toString('utf8');
      }
      new_metadata.error = build_error.FunctionError
        ? { message: 'Error building module', source: 'function', details: build_error }
        : { message: 'Error building module', source: 'infrastructure', details: build_error.message };
    } else {
      new_metadata.status = 'success';
    }
    return Common.S3.putObject(
      {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: Common.get_module_metadata_key(
          ctx.options.lambda.runtime,
          name,
          ctx.options.internal.resolved_dependencies[name]
        ),
        Body: JSON.stringify(new_metadata),
        ContentType: 'application/json',
      },
      (e, d) => {
        if (e) return cb(e);
        return cb(build_error);
      }
    );
  }
}

function compile_deployment_package(ctx, cb) {
  if (ctx.options.internal.build_plan !== 'full_build' && ctx.options.internal.build_plan !== 'partial_build') {
    // No need for building deployment package because neither the function or dependencies changed
    return cb();
  }

  // Construct builder function invocation parameters
  let builder_invoke_params = {
    FunctionName: get_function_builder_name(ctx.options),
    Payload: JSON.stringify({
      files: ctx.options.nodejs.files,
      internal_files: {
        'executor.js': executor_js, // entry point to Lambda function
      },
      put: ctx.options.internal.function_signed_url,
      dependencies: ctx.options.internal.resolved_dependencies,
      module_signed_urls: ctx.options.internal.module_signed_urls,
      max_concurrent_module_download: +process.env.LAMBDA_MAX_CONCURRENT_MODULE_DOWNLOAD || 5,
    }),
    InvocationType: 'RequestResponse',
    LogType: 'Tail',
  };

  // This logic forces the builder to be (re)created if LAMBDA_BUILDER_FORCE_CREATE is set,
  // otherwise it lazily creates the builder if needed.
  return +process.env.LAMBDA_BUILDER_FORCE_CREATE ? create_builder_then_compile(true) : compile_pass(false);

  function create_builder_then_compile(delete_before_creating) {
    return Async.series(
      [
        cb => (delete_before_creating ? delete_builder(ctx.options, cb) : cb()),
        cb => create_function_builder(ctx.options, cb),
        cb => compile_pass(true),
      ],
      e => {
        if (e) return cb(e); // otherwise cb called from compile_pass(true)
      }
    );
  }

  function compile_pass(is_final) {
    return Common.Lambda.invoke(builder_invoke_params, (e, d) => {
      if (e) {
        if (e.code === 'ResourceNotFoundException' && !is_final) {
          return create_builder_then_compile(false);
        }
        return cb(e);
      }
      if (d.StatusCode !== 200 || d.FunctionError) {
        return cb(d);
      }
      return cb();
    });
  }
}

function delete_builder(options, cb) {
  return Common.Lambda.deleteFunction(
    {
      FunctionName: get_function_builder_name(options),
    },
    e => (e && e.code !== 'ResourceNotFoundException' ? cb(e) : cb())
  );
}

function delete_module_builder(name, ctx, cb) {
  return Common.Lambda.deleteFunction(
    {
      FunctionName: get_module_builder_name(ctx.options.lambda.runtime, name),
    },
    e => (e && e.code !== 'ResourceNotFoundException' ? cb(e) : cb())
  );
}

function create_function_builder(options, cb) {
  let create_builder_params = {
    FunctionName: get_function_builder_name(options),
    Description: get_function_builder_description(options),
    Runtime: options.lambda.runtime,
    Handler: 'index.buildFunction',
    MemorySize: +process.env.LAMBDA_BUILDER_MEMORY_SIZE || 128,
    Timeout: +process.env.LAMBDA_BUILDER_TIMEOUT || 120,
    Code: {
      ZipFile: builder_zip,
    },
    Role: process.env.LAMBDA_BUILDER_ROLE,
  };
  return Common.Lambda.createFunction(create_builder_params, (e, d) => (e ? cb(e) : cb()));
}

function create_module_builder(name, ctx, cb) {
  let create_builder_params = {
    FunctionName: get_module_builder_name(ctx.options.lambda.runtime, name),
    Description: get_module_builder_description(ctx.options.lambda.runtime, name),
    Runtime: ctx.options.lambda.runtime,
    Handler: 'index.buildModule',
    MemorySize: +process.env.LAMBDA_MODULE_BUILDER_MEMORY_SIZE || 128,
    Timeout: +process.env.LAMBDA_MODULE_BUILDER_TIMEOUT || 120,
    Code: {
      ZipFile: builder_zip,
    },
    Role: process.env.LAMBDA_MODULE_BUILDER_ROLE,
  };
  return Common.Lambda.createFunction(create_builder_params, (e, d) => (e ? cb(e) : cb()));
}
