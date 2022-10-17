import crypto from 'crypto';
import Path from 'path';

import {
  dynamoScanTable,
  expBackoff,
  asyncPool,
  duplicate,
  safePath,
  safePathMap,
  isUuid,
  getAuthToken,
  mergeDeep,
  createUniqueIdentifier,
  getInstanceId,
} from './utilities';

interface IModuleSpec {
  registry: string;
  version: string;
}

import { isSpecialized, Permissions, RestrictedPermissions, UserPermissions, v2Permissions } from './permissions';

const NotBeforeHeader = 'fusebit-task-not-before'; // epoch time

const MaxLambdaExecutionTimeSeconds = 900;

const API_PUBLIC_ENDPOINT = process.env.LOGS_HOST
  ? `https://${process.env.LOGS_HOST}`
  : (process.env.API_SERVER as string);

const GRAFANA_ENDPOINT = process.env.GRAFANA_ENDPOINT
  ? `http://${process.env.GRAFANA_ENDPOINT}:3000`
  : 'http://localhost:3000';

const LOKI_ENDPOINT = process.env.GRAFANA_ENDPOINT
  ? `http://${process.env.GRAFANA_ENDPOINT}:3100`
  : `http://localhost:3100`;

const TEMPO_ENDPOINT = process.env.GRAFANA_ENDPOINT
  ? `http://${process.env.GRAFANA_ENDPOINT}:3200`
  : `http://localhost:3200`;

const GRAFANA_HEALTH_ENDPOINT = process.env.GRAFANA_ENDPOINT
  ? `http://${process.env.GRAFANA_ENDPOINT}:9999`
  : `http://localhost:9999`;

const TEMPO_GRPC_INGEST = process.env.GRAFANA_ENDPOINT
  ? `grpc://${process.env.GRAFANA_ENDPOINT}:4317`
  : 'grpc://localhost:4317';

const GRAFANA_LEADER_PREFIX = 'leader-';

const API_PUBLIC_HOST = new URL(API_PUBLIC_ENDPOINT || 'http://localhost').host;

const isGrafanaEnabled = () => !!process.env.GRAFANA_ENDPOINT;

const GRAFANA_AUTH_HEADER = 'X-WEBAUTH-USER';
const GRAFANA_ORG_HEADER = 'X-Grafana-Org-Id';

const FUSEBIT_QUERY_AUTHZ = 'fusebitAuthorization';
const FUSEBIT_QUERY_ACCOUNT = 'fusebitAccountId';

const GRAFANA_CREDENTIALS_SSM_PATH = '/fusebit/grafana/credentials/';

const GRAFANA_HEALTH_FUNCTION_NAME = '-grafana-hc';

const GRAFANA_HEALTH_FX_ROLE_NAME = 'grafana-lambda-health-role';

const CRON_EXECUTOR_NAME = `${process.env.DEPLOYMENT_KEY}-cron-executor`;

let builderVersion: string = 'unknown';
try {
  builderVersion = require(Path.join(__dirname, '..', '..', '..', 'package.json')).version;
} catch (_) {}

const valid_boundary_name = /^[A-Za-z0-9\-]{1,63}$/;

const valid_function_name = /^[A-Za-z0-9\-]{1,64}$/;

const traceIdHeader = 'fusebit-trace-id';

const makeTraceId = () => crypto.randomBytes(16).toString('hex');
const makeTraceSpanId = () => crypto.randomBytes(8).toString('hex');

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

// Stores built npm modules
const module_key_prefix = 'npm-module';

const REGISTRY_CATEGORY = 'registry-npm-package';
const REGISTRY_CATEGORY_CONFIG = 'registry-npm-config';

const REGISTRY_DEFAULT = 'default';
const REGISTRY_GLOBAL = 'registry-global';

const DEFAULTS_CATEGORY = 'deployment-defaults';
const DEFAULTS_SUBSCRIPTION = 'subscription-defaults';

const REGISTRY_RESERVED_SCOPE_PREFIX = '@fuse';

const MODULE_PUBLIC_REGISTRY = 'public';
const MODULE_PUBLIC_INTERNAL_REGISTRY = '@fusebit-int';

const RUNAS_ISSUER = 'runas-system-issuer';

const MAX_CACHE_REFRESH_RATE = 10 * 1000;

const EPHEMERAL_ENTITY_EXPIRATION = 10 * 60 * 60 * 1000;

// Changes to this variable will also require changing AgentTooltip.tsx in Portal.
const RUNAS_SYSTEM_ISSUER_SUFFIX = 'system.fusebit.io';

const JWT_PERMISSION_CLAIM = 'https://fusebit.io/permissions';
const JWT_PROFILE_CLAIM = 'https://fusebit.io/profile';
const JWT_ATTRIBUTES_CLAIM = 'https://fusebit.io/attributes';

const RUNAS_KID_LEN = 8;

function get_log_table_name(deploymentKey: string): string {
  return `${deploymentKey}.log`;
}

function get_key_value_table_name(deploymentKey: string): string {
  return `${deploymentKey}.key-value`;
}

function get_subscription_table_name(deploymentKey: string): string {
  return `${deploymentKey}.subscription`;
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

  if (
    typeof moduleSpec === 'string' ||
    moduleSpec.registry === MODULE_PUBLIC_REGISTRY ||
    name.indexOf(MODULE_PUBLIC_INTERNAL_REGISTRY) === 0
  ) {
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
    [name, builderVersion].join(':'),
    moduleSpec,
    false,
    ':'
  );
}

function get_function_builder_description(options: any) {
  return `function-builder:${options.compute.runtime}:${builderVersion}`;
}

// Create a predictable fixed-length version of the lambda name, to avoid accidentally exceeding any name
// limits.
function get_function_builder_name(options: any) {
  return crypto.createHash('sha1').update(get_function_builder_description(options)).digest('hex');
}

function get_module_builder_name(ctx: any, name: string) {
  return crypto
    .createHash('sha1')
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

function get_user_function_name(options: any, version?: string) {
  return (
    crypto.createHash('sha1').update(get_user_function_description(options)).digest('hex') +
    (version !== undefined ? `:${version}` : '')
  );
}

function get_task_queue_description(options: any, path: string) {
  return `task:${options.accountId}:${options.subscriptionId}:${options.boundaryId}:${options.functionId}:${path}`;
}

function get_task_queue_names() {
  const random = crypto.randomBytes(32).toString('hex');
  return {
    taskQueueName: `task-${random}.fifo`,
    delayedTaskQueueName: `delayed-task-${random}`,
  };
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
  return `${get_fusebit_endpoint(req)}/v1${get_function_path(subscriptionId, boundaryId, functionId)}`;
}

function get_function_management_endpoint(
  req: any,
  accountId: string,
  subscriptionId: string,
  boundaryId: string,
  functionId: string
) {
  return `${get_fusebit_endpoint(
    req
  )}/v1/account/${accountId}/subscription/${subscriptionId}/boundary/${boundaryId}/function/${functionId}`;
}

function get_fusebit_endpoint(req: any) {
  // If LOGS_HOST is set, the stack is running on localhost with an established public tunnel to it.
  // Use the tunnel as the Fusebit function endpoint to enable Fusebit function to call back into the local stack.
  // Otherwise (stack running in the cloud), derive the endpoint from the request.
  if (!process.env.LOGS_HOST) {
    if (req.headers && req.headers['x-forwarded-proto'] && req.headers.host) {
      return `${req.headers['x-forwarded-proto'].split(',')[0]}://${req.headers.host}`;
    }

    if (req.protocol && req.headers && req.headers.host) {
      return `${req.protocol}://${req.headers.host}`;
    }
  }
  return API_PUBLIC_ENDPOINT;
}

function get_function_path(subscriptionId: string, boundaryId: string, functionId: string) {
  return `/run/${subscriptionId}/${boundaryId}/${functionId}`;
}

const get_compute_tag_key = (key: string) => `compute.${key}`;
const get_dependency_tag_key = (key: string) => `dependency.${key}`;
const get_versions_tag_key = (key: string) => `environment.${key}`;
const get_metadata_tag_key = (key: string) => `tag.${key}`;
const get_template_tag_key = (key: string) => `template.${key}`;
const get_fusebit_tag_key = (key: string) => `fusebit.${key}`;
const get_security_tag_key = (key: string) => `security.${key}`;
const get_routes_tag_key = () => `routes`;

function isSystemIssuer(issuerId: string) {
  return issuerId.match(`${RUNAS_SYSTEM_ISSUER_SUFFIX}$`);
}

function makeSystemIssuerId(kid: string) {
  return `${kid}.${RUNAS_SYSTEM_ISSUER_SUFFIX}`;
}

function makeFunctionSub(params: any, mode: string) {
  return ['uri', 'function', params.accountId, params.subscriptionId, params.boundaryId, params.functionId, mode].join(
    ':'
  );
}

const getFunctionPermissions = (summary: any): any => {
  return summary[get_security_tag_key('permissions')];
};

const getFunctionRoutes = (summary: any): any => {
  return summary[get_routes_tag_key()];
};

const getFunctionVersion = (summary: any): any => {
  return summary[get_versions_tag_key('function')];
};

const getFunctionAuthorization = (summary: any): any => {
  return summary[get_security_tag_key('authorization')];
};

const getFunctionAuthentication = (summary: any): any => {
  return summary[get_security_tag_key('authentication')];
};

export {
  get_log_table_name,
  get_key_value_table_name,
  get_subscription_table_name,
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
  get_task_queue_description,
  get_task_queue_names,
  get_function_builder_description,
  get_module_builder_description,
  get_function_builder_name,
  get_module_builder_name,
  get_cron_key_prefix,
  get_cron_key_suffix,
  get_cron_key,
  get_function_location,
  get_function_path,
  get_fusebit_endpoint,
  get_deployment_s3_bucket,
  get_compute_tag_key,
  get_dependency_tag_key,
  get_versions_tag_key,
  get_metadata_tag_key,
  get_template_tag_key,
  get_fusebit_tag_key,
  get_security_tag_key,
  get_routes_tag_key,
  Permissions,
  v2Permissions,
  RestrictedPermissions,
  UserPermissions,
  isSpecialized,
  isSystemIssuer,
  makeSystemIssuerId,
  makeFunctionSub,
  getFunctionPermissions,
  getFunctionRoutes,
  getFunctionVersion,
  getFunctionAuthorization,
  getFunctionAuthentication,
  EPHEMERAL_ENTITY_EXPIRATION,
  REGISTRY_CATEGORY,
  REGISTRY_CATEGORY_CONFIG,
  REGISTRY_DEFAULT,
  REGISTRY_GLOBAL,
  DEFAULTS_CATEGORY,
  DEFAULTS_SUBSCRIPTION,
  MODULE_PUBLIC_REGISTRY,
  RUNAS_ISSUER,
  RUNAS_KID_LEN,
  JWT_PERMISSION_CLAIM,
  JWT_PROFILE_CLAIM,
  JWT_ATTRIBUTES_CLAIM,
  REGISTRY_RESERVED_SCOPE_PREFIX,
  RUNAS_SYSTEM_ISSUER_SUFFIX,
  API_PUBLIC_ENDPOINT,
  isGrafanaEnabled,
  GRAFANA_ENDPOINT,
  GRAFANA_AUTH_HEADER,
  GRAFANA_HEALTH_FX_ROLE_NAME,
  GRAFANA_HEALTH_FUNCTION_NAME,
  GRAFANA_LEADER_PREFIX,
  GRAFANA_ORG_HEADER,
  GRAFANA_CREDENTIALS_SSM_PATH,
  LOKI_ENDPOINT,
  TEMPO_GRPC_INGEST,
  TEMPO_ENDPOINT,
  GRAFANA_HEALTH_ENDPOINT,
  API_PUBLIC_HOST,
  MAX_CACHE_REFRESH_RATE,
  FUSEBIT_QUERY_AUTHZ,
  FUSEBIT_QUERY_ACCOUNT,
  dynamoScanTable,
  expBackoff,
  asyncPool,
  duplicate,
  IModuleSpec,
  safePath,
  safePathMap,
  isUuid,
  getAuthToken,
  mergeDeep,
  createUniqueIdentifier,
  traceIdHeader,
  makeTraceId,
  makeTraceSpanId,
  CRON_EXECUTOR_NAME,
  get_function_management_endpoint,
  NotBeforeHeader,
  MaxLambdaExecutionTimeSeconds,
  getInstanceId,
};
