import Crypto from 'crypto';

const valid_boundary_name = /^[a-z0-9\-]{1,63}$/;

const valid_function_name = /^[a-z0-9\-]{1,64}$/;

// Stores status of a function build (async operation)
// This prefix has 1 day TTL in S3
const function_build_status_key_prefix = 'function-build-status';

// Stores the parameters of a function build for the build duration
// This prefix has 1 day TTL in S3
const function_build_request_key_prefix = 'function-build-request';

// Stores lambda deployment package of the current function
// TODO: should this also have TTL?
const function_build_key_prefix = 'function-build';

// Stores the parameters of the current function
const function_spec_key_prefix = 'function-spec';

// Stores registrations of active cron jobs
const cron_key_prefix = 'function-cron';

// Stores built NPM modules
const module_key_prefix = 'npm-module';

function get_log_table_name(deploymentKey: string): string {
  return `${deploymentKey}.log`;
}

function get_key_value_table_name(deploymentKey: string): string {
  return `${deploymentKey}.key-value`;
}

function get_deployment_s3_bucket(deployment: any): string {
  return deployment.featureUseDnsS3Bucket
    ? `${deployment.deploymentName}.${deployment.region}.${deployment.domainName}`
    : `fusebit-${deployment.deploymentName}-${deployment.region}`;
}

function get_module_metadata_key(runtime: string, name: string, version: string) {
  return `${module_key_prefix}/${runtime}/${name}/${version}/metadata.json`;
}

function get_module_key(runtime: string, name: string, version: string) {
  return `${module_key_prefix}/${runtime}/${name}/${version}/package.zip`;
}

function get_user_function_build_status_key(options: any) {
  return `${function_build_status_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/${options.buildId}.json`;
}

function get_user_function_build_request_key(options: any) {
  return `${function_build_request_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/${options.buildId}.json`;
}

function get_user_function_build_key(options: any) {
  return `${function_build_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/package.zip`;
}

function get_user_function_spec_key(options: any) {
  return `${function_spec_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/spec.json`;
}

function get_user_function_description(options: any) {
  return `function:${options.subscriptionId}:${options.boundaryId}:${options.functionId}`;
}

function get_user_function_name(options: any) {
  return Crypto.createHash('sha1').update(get_user_function_description(options)).digest('hex');
}

function get_cron_key_prefix(options: any) {
  return `${cron_key_prefix}/${options.subscriptionId}/${options.boundaryId}/${options.functionId}/`;
}

function get_cron_key_suffix(options: any) {
  return Buffer.from(JSON.stringify([options.schedule.cron, options.schedule.timezone || 'UTC'])).toString('hex');
}

function get_cron_key(options: any) {
  return `${get_cron_key_prefix(options)}${get_cron_key_suffix(options)}`;
}

function get_function_location(req: any, subscriptionId: string, boundaryId: string, functionId: string) {
  const baseUrl = req.headers['x-forwarded-proto']
    ? `${req.headers['x-forwarded-proto'].split(',')[0]}://${req.headers.host}`
    : `${req.protocol}://${req.headers.host}`;
  return `${baseUrl}/v1/run/${subscriptionId}/${boundaryId}/${functionId}`;
}

export {
  get_log_table_name,
  get_key_value_table_name,
  valid_boundary_name,
  valid_function_name,
  function_build_status_key_prefix,
  function_build_request_key_prefix,
  function_build_key_prefix,
  function_spec_key_prefix,
  cron_key_prefix,
  module_key_prefix,
  get_module_metadata_key,
  get_module_key,
  get_user_function_build_status_key,
  get_user_function_build_request_key,
  get_user_function_build_key,
  get_user_function_spec_key,
  get_user_function_description,
  get_user_function_name,
  get_cron_key_prefix,
  get_cron_key_suffix,
  get_cron_key,
  get_function_location,
  get_deployment_s3_bucket,
};
