const Crypto = require('crypto');
const AWS = require('aws-sdk');

exports.valid_boundary_name = /^[a-z0-9\-]{1,63}$/;

exports.valid_function_name = /^[a-z0-9\-]{1,64}$/;

// Stores status of a function build (async operation)
// This prefix has 1 day TTL in S3
exports.function_build_status_key_prefix = 'function-build-status';

// Stores the parameters of a function build for the build duration
// This prefix has 1 day TTL in S3
exports.function_build_request_key_prefix = 'function-build-request';

// Stores lambda deployment package of the current function
// TODO: should this also have TTL?
exports.function_build_key_prefix = 'function-build';

// Stores the parameters of the current function
exports.function_spec_key_prefix = 'function-spec';

// Stores built NPM modules
exports.module_key_prefix = 'npm-module';

exports.Lambda = new AWS.Lambda({ 
    apiVersion: '2015-03-31'
});

exports.S3 = new AWS.S3({ 
    apiVersion: '2006-03-01', 
    signatureVersion: 'v4',
    region: process.env.AWS_REGION,
    params: {
        Bucket: process.env.AWS_S3_BUCKET,
    }
});

exports.get_module_metadata_key = function get_module_metadata_key(runtime, name, version) {
    return `${exports.module_key_prefix}/${runtime}/${name}/${version}/metadata.json`;
}

exports.get_module_key = function get_module_key(runtime, name, version) {
    return `${exports.module_key_prefix}/${runtime}/${name}/${version}/package.zip`;
}

exports.get_user_function_build_status_key = function get_user_function_build_status_key(options) {
    return `${exports.function_build_status_key_prefix}/${options.boundary}/${options.name}/${options.build_id}.json`;
};

exports.get_user_function_build_request_key = function get_user_function_build_request_key(options) {
    return `${exports.function_build_request_key_prefix}/${options.boundary}/${options.name}/${options.build_id}.json`;
};

exports.get_user_function_build_key = function get_user_function_build_key(options) {
    return `${exports.function_build_key_prefix}/${options.boundary}/${options.name}/package.zip`;
};

exports.get_user_function_spec_key = function get_user_function_spec_key(options) {
    return `${exports.function_spec_key_prefix}/${options.boundary}/${options.name}/spec.json`;
};

exports.get_user_function_description = function get_user_function_description(options) {
    return `function:${options.boundary}:${options.name}`;
};

exports.get_user_function_name = function get_user_function_name(options) {
    return Crypto.createHash('sha1').update(exports.get_user_function_description(options)).digest('hex');
};

exports.save_function_build_status = function save_function_build_status(status, cb) {
    return exports.S3.putObject({
        Bucket: process.env.AWS_S3_BUCKET, 
        Key: exports.get_user_function_build_status_key(status),
        Body: JSON.stringify(status),
        ContentType: 'application/json',
    }, e => e ? cb(e) : cb());
};
