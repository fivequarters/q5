import Crypto from 'crypto';
import Path from 'path';

interface IModuleSpec {
  registry: string;
  version: string;
}

import { isSpecialized, Permissions, RestrictedPermissions, UserPermissions } from './permissions';

const builder_version = require(Path.join(__dirname, '..', '..', '..', 'package.json')).version;

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

const REGISTRY_CATEGORY = 'registry-npm-package';
const REGISTRY_CATEGORY_CONFIG = 'registry-npm-config';

const REGISTRY_DEFAULT = 'default';
const REGISTRY_GLOBAL = 'registry-global';

const MODULE_PUBLIC_REGISTRY = 'public';

const RUNAS_ISSUER = 'runas-system-issuer';

const JWT_PERMISSION_CLAIM = 'https://fusebit.io/permissions';

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

function get_module_prefix(
  prefix: string,
  runtime: string,
  name: string,
  moduleSpec: IModuleSpec | string,
  useVer: boolean,
  sep: string
) {
  const version = typeof moduleSpec === 'string' ? moduleSpec : moduleSpec.version;

  if (typeof moduleSpec === 'string' || moduleSpec.registry === MODULE_PUBLIC_REGISTRY) {
    // Old style module, assume it's global.
    return (useVer ? [prefix, runtime, name, version] : [prefix, runtime, name]).join(sep);
  }
  return (useVer
    ? [prefix, moduleSpec.registry, runtime, name, version]
    : [prefix, moduleSpec.registry, runtime, name]
  ).join(sep);
}

function get_module_metadata_key(runtime: string, name: string, moduleSpec: IModuleSpec | string) {
  return `${get_module_prefix(module_key_prefix, runtime, name, moduleSpec, true, '/')}/metadata.json`;
}

function get_module_key(runtime: string, name: string, moduleSpec: IModuleSpec) {
  return `${get_module_prefix(module_key_prefix, runtime, name, moduleSpec, true, '/')}/package.zip`;
}

function get_module_builder_description(ctx: any, name: string, moduleSpec: IModuleSpec) {
  return get_module_prefix(
    'module-builder',
    ctx.options.compute.runtime,
    [name, builder_version].join(':'),
    moduleSpec,
    false,
    ':'
  );
}

function get_function_builder_description(options: any) {
  return `function-builder:${options.compute.runtime}:${builder_version}`;
}

// Create a predictable fixed-length version of the lambda name, to avoid accidentally exceeding any name
// limits.
function get_function_builder_name(options: any) {
  return Crypto.createHash('sha1').update(get_function_builder_description(options)).digest('hex');
}

function get_module_builder_name(ctx: any, name: string) {
  return Crypto.createHash('sha1')
    .update(get_module_builder_description(ctx, name, ctx.options.internal.resolved_dependencies[name]))
    .digest('hex');
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

function duplicate(dst: any, src: any) {
  Object.keys(src).forEach((k) => {
    dst[k] = typeof src[k] === 'object' ? duplicate({}, src[k]) : (dst[k] = src[k]);
  });

  return dst;
}

function isSystemIssuer(issuerId: string) {
  return issuerId.match(`system.fusebit.io$`);
}

function makeSystemIssuerId(kid: string) {
  return `${kid}.system.fusebit.io`;
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
  get_function_builder_description,
  get_module_builder_description,
  get_function_builder_name,
  get_module_builder_name,
  get_cron_key_prefix,
  get_cron_key_suffix,
  get_cron_key,
  get_function_location,
  get_deployment_s3_bucket,
  duplicate,
  Permissions,
  RestrictedPermissions,
  UserPermissions,
  isSpecialized,
  isSystemIssuer,
  makeSystemIssuerId,
  REGISTRY_CATEGORY,
  REGISTRY_CATEGORY_CONFIG,
  REGISTRY_DEFAULT,
  REGISTRY_GLOBAL,
  MODULE_PUBLIC_REGISTRY,
  RUNAS_ISSUER,
  JWT_PERMISSION_CLAIM,
};
