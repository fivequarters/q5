const Assert = require('assert');
const Async = require('async');
const Fs = require('fs');
const Path = require('path');
const JSZip = require('jszip');
const Crypto = require('crypto');
const Common = require('./common');

// TODO: move this logic to a Lambda or other worker

const executor_js = Fs.readFileSync(Path.join(__dirname, '../lambda/executor.js'), { encoding: 'utf8' });
const builder_version = JSON.parse(Fs.readFileSync(Path.join(__dirname, '../package.json'),'utf8')).version;

module.exports = function create_function(status, cb) {
    Assert.ok(status);
    Assert.equal(typeof(status.boundary), 'string', 'boundary must be specified');
    Assert.ok(status.boundary.match(Common.valid_boundary_name), 'boundary name must be value');
    Assert.equal(typeof(status.name), 'string', 'function name must be specified');
    Assert.ok(status.name.match(Common.valid_function_name), 'function name must be valid');
    Assert.equal(typeof(status.build_id), 'string', 'build_id must be provided');

    transition_state('building');

    var ctx = { status };

    return Async.series([
        (cb) => get_build_request(ctx, cb),            // any build plan
        (cb) => save_function_build_status(ctx, cb),   // any build plan
        (cb) => create_signed_s3_urls(ctx, cb),        // full_build or partial_build only
        (cb) => compile_missing_dependencies(ctx, cb), // full_build only
        (cb) => compile_deployment_package(ctx, cb),   // full_build or partial_build only
        (cb) => create_user_function(ctx, cb),         // full_build or partial_build only
        (cb) => update_user_function_config(ctx, cb),  // update_configuration only
    ], (e) => {
        if (e) {
            transition_state('failed');
            status.error = e;
        }
        else {
            transition_state('success');
        }
        return Async.series([
            (cb) => e ? cb() : save_function_spec(ctx.options, cb),
            (cb) => delete_build_request(ctx.options, cb),
            (cb) => save_function_build_status(ctx, cb)
        ], e => {
            if (e) console.error('FUNCTION BUILD FAILED', e);
            if (typeof cb === 'function') {
                cb(e, e ? null : status);
            }
        });
    });

    function transition_state(new_state) {
        status.status = new_state;
        status.transitions[new_state] = new Date().toString();
    }
};

function save_function_build_status(ctx, cb) {
    if (ctx.options.internal.build_plan !== 'full_build') {
        // No async build is happening, do not update build status in S3
        return cb();
    }

    return Common.save_function_build_status(ctx.status, cb)
}

function delete_build_request(options, cb) {
    return Common.S3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: Common.get_user_function_build_request_key(options),
    }, e => e ? cb(e) : cb());
}

function get_build_request(ctx, cb) {
    return Common.S3.getObject({
        Bucket: process.env.AWS_S3_BUCKET, 
        Key: Common.get_user_function_build_request_key(ctx.status),
    }, (e, d) => {
        if (e) return cb(e);
        try {
            d.Body = JSON.parse(d.Body.toString('utf8'));
        }
        catch (e) {
            return cb(e);
        }
        ctx.options = d.Body;
        return cb();
    });
}

function save_function_spec(options, cb) {
    return Common.S3.putObject({
        Bucket: process.env.AWS_S3_BUCKET, 
        Key: Common.get_user_function_spec_key(options),
        Body: JSON.stringify(options),
        ContentType: 'application/json',
        Metadata: options.internal.new_metadata,
    }, e => e ? cb(e) : cb());
}

function create_user_function(ctx, cb) {

    if (ctx.options.internal.build_plan !== 'full_build' && ctx.options.internal.build_plan !== 'partial_build') {
        // No need for recreating the entire function
        return cb();
    }

    return Async.waterfall([
        (cb) => delete_user_function(ctx.options, cb),
        (cb) => create_user_function_impl(ctx, cb)
    ], cb);
}

function delete_user_function(options, cb) {
    return Common.Lambda.deleteFunction({
        FunctionName: Common.get_user_function_name(options),
    }, e => e && e.code !== 'ResourceNotFoundException' ? cb(e) : cb());
}

function create_user_function_impl(ctx, cb) {
    let create_function_params = {
        FunctionName: Common.get_user_function_name(ctx.options),
        Description: Common.get_user_function_description(ctx.options),
        Runtime: ctx.options.lambda.runtime,
        Handler: 'executor.execute',
        MemorySize: ctx.options.lambda.memory_size,
        Timeout: ctx.options.lambda.timeout,
        Environment: { Variables: ctx.options.configuration },
        Code: { 
            S3Bucket: process.env.AWS_S3_BUCKET,
            S3Key: ctx.options.internal.function_signed_url.key,
        },
        Role: process.env.LAMBDA_USER_FUNCTION_ROLE,
    };

    return Common.Lambda.createFunction(create_function_params, cb);
}

function update_user_function_config(ctx, cb) {

    if (ctx.options.internal.build_plan !== 'update_configuration') {
        // If a function is fully or partially built, configuration is set at that point.
        // Only in update_configuration build plan just the function config needs to be updated.
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
    return Async.parallel([
        (cb) => get_signed_s3_urls_for_modules(ctx, cb),
        (cb) => get_signed_s3_urls_for_function(ctx, cb)
    ], cb);

    function get_signed_s3_urls_for_modules(ctx, cb) {
        if (ctx.options.internal.build_plan !== 'full_build' && ctx.options.internal.build_plan !== 'partial_build') {
            // No need for signed URLs because the function does not need to be build
            return cb();
        }

        ctx.options.internal.module_signed_urls = { put: {}, get: {} };

        return Async.each(
            Object.keys(ctx.options.internal.resolved_dependencies),
            (name, cb) => get_signed_s3_urls_for_module(name, ctx, cb),
            cb);
    }

    function get_signed_s3_urls_for_module(name, ctx, cb) {
        let s3_package_key = Common.get_module_key(ctx.options.lambda.runtime, name, ctx.options.internal.resolved_dependencies[name]);

        return Async.parallel([
            (cb) => get_signed_s3_urls_for_module_put(s3_package_key, name, ctx, cb),
            (cb) => get_signed_s3_urls_for_module_get(s3_package_key, ctx, cb),
        ], cb)

        function get_signed_s3_urls_for_module_put(key, name, ctx, cb) {
            if (!ctx.options.internal.missing_dependencies[name]) {
                // The module does not need to be built, no need for a signed url for PUT
                return cb();
            }
            return Common.S3.getSignedUrl('putObject', {
                Key: key,
                ContentType: 'application/zip',
            }, (e, u) => {
                if (e) return cb(e);
                ctx.options.internal.module_signed_urls.put[name] = { key: s3_package_key, url: u };
                return cb();
            });
        }

        function get_signed_s3_urls_for_module_get(key, ctx, cb) {
            return Common.S3.getSignedUrl('getObject', {
                Key: key,
            }, (e, u) => {
                if (e) return cb(e);
                ctx.options.internal.module_signed_urls.get[name] = { key: s3_package_key, url: u };
                return cb();
            });
        }

    }

    function get_signed_s3_urls_for_function(ctx, cb) {
        let s3_package_key = Common.get_user_function_build_key(ctx.options);
        return Common.S3.getSignedUrl('putObject', {
            Key: s3_package_key,
            ContentType: 'application/zip',
        }, (e, u) => {
            if (e) return cb(e);
            ctx.options.internal.function_signed_url = { key: s3_package_key, url: u };
            return cb();
        });
    }
}

function get_builder_description(options) {
    return `function-builder:${builder_version}`;
}

function get_module_builder_description(runtime, name) {
    return `module-builder:${runtime}:${name}:${builder_version}`;
}

function get_builder_name(options) {
    return Crypto.createHash('sha1').update(get_builder_description(options)).digest('hex');
}

function get_module_builder_name(runtime, name) {
    return Crypto.createHash('sha1').update(get_module_builder_description(runtime, name)).digest('hex');
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
        return Async.series([
            (cb) => delete_before_creating ? delete_module_builder(name, ctx, cb) : cb(),
            (cb) => create_module_builder(name, ctx, cb),
            (cb) => module_compile_pass(true)
        ], (e) => {
            if (e) return cb(e); // otherwise cb called from module_compile_pass(true)
        });
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
            new_metadata.backoff = Date.now() + (new_metadata.backoff_step || +process.env.LAMBDA_MODULE_BUILDER_INITIAL_BACKOFF || 120000);
            new_metadata.backoff_step = Math.floor((new_metadata.backoff_step || +process.env.LAMBDA_MODULE_BUILDER_INITIAL_BACKOFF || 120000) * (+process.env.LAMBDA_MODULE_BUILDER_BACKOFF_RATIO || 1.2));
            if (build_error.LogResult) {
                build_error.LogResult = new Buffer(error.LogResult, 'base64').toString('utf8');
            }
            new_metadata.error = build_error.FunctionError 
                ? { message: 'Error building module', source: 'function', details: build_error } 
                : { message: 'Error building module', source: 'infrastructure', details: build_error.message };
        }
        else {
            new_metadata.status = 'success';
        }
        return Common.S3.putObject({
            Bucket: process.env.AWS_S3_BUCKET, 
            Key: Common.get_module_metadata_key(ctx.options.lambda.runtime, name, ctx.options.internal.resolved_dependencies[name]),
            Body: JSON.stringify(new_metadata),
            ContentType: 'application/json',    
        }, (e, d) => {
            if (e) return cb(e);
            return cb(build_error);
        })
    }
}

function compile_deployment_package(ctx, cb) {

    if (ctx.options.internal.build_plan !== 'full_build' && ctx.options.internal.build_plan !== 'partial_build') {
        // No need for building deployment package because neither the function or dependencies changed
        return cb();
    }

    // Inject Lambda handler as a wrapper around user function
    ctx.options.nodejs.files['executor.js'] = executor_js;

    // Construct builder function invocation parameters
    let builder_invoke_params = {
        FunctionName: get_builder_name(ctx.options),
        Payload: JSON.stringify({
            files: ctx.options.nodejs.files,
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
    return +process.env.LAMBDA_BUILDER_FORCE_CREATE
        ? create_builder_then_compile(true)
        : compile_pass(false);

    function create_builder_then_compile(delete_before_creating) {
        return Async.series([
            (cb) => delete_before_creating ? delete_builder(ctx.options, cb) : cb(),
            (cb) => create_builder(ctx.options, cb),
            (cb) => compile_pass(true)
        ], (e) => {
            if (e) return cb(e); // otherwise cb called from compile_pass(true)
        });
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
            delete ctx.options.nodejs.files['executor.js'];
            return cb();
        });
    }
}

function delete_builder(options, cb) {
    return Common.Lambda.deleteFunction({
        FunctionName: get_builder_name(options),
    }, e => e && e.code !== 'ResourceNotFoundException' ? cb(e) : cb());
}

function delete_module_builder(name, ctx, cb) {
    return Common.Lambda.deleteFunction({
        FunctionName: get_module_builder_name(ctx.options.lambda.runtime, name)
    }, e => e && e.code !== 'ResourceNotFoundException' ? cb(e) : cb());
}

function create_builder(options, cb) {
    return Async.waterfall([
        (cb) => ensure_builder_zip(cb),
        (zip, cb) => create_builder_function(zip, options, cb)
    ], cb);
}

function create_module_builder(name, ctx, cb) {
    return Async.waterfall([
        (cb) => ensure_module_builder_zip(cb),
        (zip, cb) => create_module_builder_function(zip, name, ctx, cb)
    ], cb);
}

function create_builder_function(zip, options, cb) {
    let create_builder_params = {
        FunctionName: get_builder_name(options),
        Description: get_builder_description(options),
        Runtime: options.lambda.runtime,
        Handler: "builder.build",
        MemorySize: +process.env.LAMBDA_BUILDER_MEMORY_SIZE || 128,
        Timeout: +process.env.LAMBDA_BUILDER_TIMEOUT || 120,
        Code: { 
            ZipFile: zip
        },
        Role: process.env.LAMBDA_BUILDER_ROLE,
    };
    return Common.Lambda.createFunction(create_builder_params, (e, d) => e ? cb(e) : cb());
}

function create_module_builder_function(zip, name, ctx, cb) {
    let create_builder_params = {
        FunctionName: get_module_builder_name(ctx.options.lambda.runtime, name),
        Description: get_module_builder_description(ctx.options.lambda.runtime, name),
        Runtime: ctx.options.lambda.runtime,
        Handler: "module_builder.build",
        MemorySize: +process.env.LAMBDA_MODULE_BUILDER_MEMORY_SIZE || 128,
        Timeout: +process.env.LAMBDA_MODULE_BUILDER_TIMEOUT || 120,
        Code: { 
            ZipFile: zip
        },
        Role: process.env.LAMBDA_MODULE_BUILDER_ROLE,
    };
console.log("CREATING MODULE BUILDER", create_builder_params);
    return Common.Lambda.createFunction(create_builder_params, (e, d) => e ? cb(e) : cb());
}

let builder_zip;
function ensure_builder_zip(cb) {
    if (builder_zip) return cb(null, builder_zip);
    let zip = new JSZip();
    zip.file('builder.js', Fs.readFileSync(Path.join(__dirname, '../lambda/builder.js'), { encoding: 'utf8' }));
    zip.file('zip.py', Fs.readFileSync(Path.join(__dirname, '../lambda/zip.py'), { encoding: 'utf8' }));
    return zip.generateAsync({ type: 'nodebuffer' })
        .then(c => {
            builder_zip = c;
            return cb(null, c);
        });
}

let module_builder_zip;
function ensure_module_builder_zip(cb) {
    if (module_builder_zip) return cb(null, module_builder_zip);
    let zip = new JSZip();
    zip.file('module_builder.js', Fs.readFileSync(Path.join(__dirname, '../lambda/module_builder.js'), { encoding: 'utf8' }));
    zip.file('zip.py', Fs.readFileSync(Path.join(__dirname, '../lambda/zip.py'), { encoding: 'utf8' }));
    return zip.generateAsync({ type: 'nodebuffer' })
        .then(c => {
            module_builder_zip = c;
            return cb(null, c);
        });
}
