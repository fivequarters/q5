const Crypto = require('crypto');
const AWS = require('aws-sdk');

if (!process.env.DEPLOYMENT_KEY) {
  throw new Error('DEPLOYMENT_KEY environment variable must be set');
}

exports.logTableName = `${process.env.DEPLOYMENT_KEY}.log`;

exports.realtime_logs_enabled = !process.env.LOGS_DISABLE;

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

// Stores registrations of active cron jobs
exports.cron_key_prefix = 'function-cron';

// Stores built NPM modules
exports.module_key_prefix = 'npm-module';

exports.Lambda = new AWS.Lambda({
  apiVersion: '2015-03-31',
});

exports.S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  region: process.env.AWS_REGION,
  params: {
    Bucket: process.env.AWS_S3_BUCKET,
  },
});

exports.SQS = new AWS.SQS({
  apiVersion: '2012-11-05',
  region: process.env.AWS_REGION,
});

exports.Dynamo = new AWS.DynamoDB({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION,
});

exports.get_module_metadata_key = function get_module_metadata_key(runtime, name, version) {
  return `${exports.module_key_prefix}/${runtime}/${name}/${version}/metadata.json`;
};

exports.get_module_key = function get_module_key(runtime, name, version) {
  return `${exports.module_key_prefix}/${runtime}/${name}/${version}/package.zip`;
};

exports.get_user_function_build_status_key = function get_user_function_build_status_key(options) {
  return `${exports.function_build_status_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/${options.buildId}.json`;
};

exports.get_user_function_build_request_key = function get_user_function_build_request_key(options) {
  return `${exports.function_build_request_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/${options.buildId}.json`;
};

exports.get_user_function_build_key = function get_user_function_build_key(options) {
  return `${exports.function_build_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/package.zip`;
};

exports.get_user_function_spec_key = function get_user_function_spec_key(options) {
  return `${exports.function_spec_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/spec.json`;
};

exports.get_user_function_description = function get_user_function_description(options) {
  return `function:${options.subscriptionId}:${options.boundaryId}:${options.functionId}`;
};

exports.get_user_function_name = function get_user_function_name(options) {
  return Crypto.createHash('sha1').update(exports.get_user_function_description(options)).digest('hex');
};

exports.get_cron_key_prefix = function get_cron_key_prefix(options) {
  return `${exports.cron_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/`;
};

exports.get_cron_key_suffix = function get_cron_key_suffix(options) {
  return Buffer.from(JSON.stringify([options.schedule.cron, options.schedule.timezone || 'UTC'])).toString('hex');
};

exports.get_cron_key = function get_cron_key(options) {
  return `${exports.get_cron_key_prefix(options)}${exports.get_cron_key_suffix(options)}`;
};

exports.save_function_build_status = function save_function_build_status(status, cb) {
  return exports.S3.putObject(
    {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: exports.get_user_function_build_status_key({
        subscriptionId: status.subscriptionId,
        boundaryId: status.boundaryId,
        functionId: status.functionId,
        buildId: status.buildId,
      }),
      Body: JSON.stringify(status),
      ContentType: 'application/json',
    },
    (e) => (e ? cb(e) : cb())
  );
};

exports.get_function_location = function get_function_location(req, subscriptionId, boundaryId, functionId) {
  let baseUrl = req.headers['x-forwarded-proto']
    ? `${req.headers['x-forwarded-proto'].split(',')[0]}://${req.headers.host}`
    : `${req.protocol}://${req.headers.host}`;
  return `${baseUrl}/v1/run/${subscriptionId}/${boundaryId}/${functionId}`;
};

exports.create_build_error_response = function create_build_error_response(build) {
  let status = (build.error && (build.error.status || build.error.statusCode)) || 500;
  let message = (build.error && build.error.message) || 'Unspecified function build error';
  let response = { status, statusCode: status, message };
  let error = build.error;
  delete build.error;
  response.properties = {
    build: build,
  };
  if (error) {
    response.properties.originalError = error;
  }
  return response;
};
