const express = require('express');
const router = express.Router();

// require('aws-sdk').config.logger = console;

const analytics = require('./middleware/analytics');
const determine_provider = require('./middleware/determine_provider');
const parse_body_conditional = require('./middleware/parse_body_conditional');
const provider_handlers = require('./handlers/provider_handlers');
const validate_schema = require('./middleware/validate_schema');
const authorize = require('./middleware/authorize');
const user_agent = require('./middleware/user_agent');
const ratelimit = require('./middleware/ratelimit');
const subCache = require('./middleware/subscription');
const { check_agent_version } = require('./middleware/version_check');
const cors = require('cors');
const create_error = require('http-errors');
const health = require('./handlers/health');
const { get_function_location } = require('@5qtrs/constants');
const redirect = require('./handlers/redirect');

const { AccountActions } = require('@5qtrs/account');
const account = require('./handlers/account');
const subscription = require('./handlers/subscription');
const issuer = require('./handlers/issuer');
const user = require('./handlers/user');
const client = require('./handlers/client');
const agent = require('./handlers/agent');
const audit = require('./handlers/audit');
const statistics = require('./handlers/statistics');
const npm = require('@5qtrs/npm');

const { clear_built_module, custom_layers_health } = require('@5qtrs/function-lambda');
const { AwsRegistry } = require('@5qtrs/registry');
const Constants = require('@5qtrs/constants');
const RDS = require('@5qtrs/db').default;

const { execAs, loadSummary, checkAuthorization } = require('@5qtrs/runas');

const { addLogging, isTaskSchedulingRequest, enforceNotBeforeHeader } = require('@5qtrs/runtime-common');

const { StorageActions } = require('@5qtrs/storage');

const { keyStore, subscriptionCache } = require('./globals');

const storage = require('./handlers/storageRds');

const grafanaHealth = require('./grafana/health');

var corsManagementOptions = {
  origins: '*',
  methods: 'GET,POST,PUT,DELETE,PATCH',
  exposedHeaders: 'x-fx-logs,x-fx-response-source,content-length,fusebit-trace-id',
  credentials: true,
};

var corsExecutionOptions = {
  origins: '*',
  methods: 'GET,POST,PUT,DELETE,PATCH,HEAD',
  exposedHeaders: 'x-fx-logs,x-fx-response-source,content-length,fusebit-trace-id',
  credentials: true,
};

const npmPackageSizeLimit = process.env.PACKAGE_SIZE_LIMIT || '100mb';

// Load the global npm registry in AWS
const npmRegistry = () =>
  AwsRegistry.handler({
    // Clear built modules from S3 when a version is put to force a rebuild
    onNewPackage: async (name, ver, registry) => clear_built_module(name, { version: ver, registry }),
  });

// Start health check executor
RDS.updateHealth();

// Health and Private Interfaces
router.get(
  '/health',
  health.getHealth([
    { check: async () => keyStore.healthCheck(), name: 'Keystore' },
    { check: async () => subscriptionCache.healthCheck(), name: 'Subscription cache' },
    { check: async () => RDS.ensureConnection(), name: 'RDS connection', once: true },
    { check: async () => RDS.ensureRDSLiveliness(), name: 'RDS execution', once: true },
    { check: async () => custom_layers_health(), name: 'Custom Layers' },
  ])
);

router.get('/health/analytics', grafanaHealth.checkGrafanaHealth());

router.get('/metrics', (req, res) => res.json({ rateLimits: ratelimit.getMetrics() }).send());

router.get('/refresh', subCache.refresh(subscriptionCache));

// Accounts

router.options('/account', cors(corsManagementOptions));
router.post(
  '/account',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.addAccount }),
  express.json(),
  validate_schema({ body: require('./validation/account') }),
  account.accountPost(),
  analytics.finished
);

router.options('/account/:accountId', cors(corsManagementOptions));
router.get(
  '/account/:accountId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.getAccount }),
  account.accountGet(),
  analytics.finished
);

router.options('/account/:accountId', cors(corsManagementOptions));
router.patch(
  '/account/:accountId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  express.json(),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.updateAccount }),
  validate_schema({ body: require('./validation/update_account') }),
  account.accountPatch(),
  analytics.finished
);

router.options('/account/:accountId/audit', cors(corsManagementOptions));
router.get(
  '/account/:accountId/audit',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.getAudit }),
  validate_schema({ query: require('./validation/api_query') }),
  audit.auditGet(),
  analytics.finished
);

// Logs

const logRoutesPost = [
  '/account/:accountId/logs',
  '/account/:accountId/subscription/:subscriptionId/logs',
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/logs',
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/logs',
];
const logRoutesGet = logRoutesPost.map((r) => `${r}/:queryId`);

router.options(logRoutesPost, cors(corsManagementOptions));
router.post(
  logRoutesPost,
  analytics.enterHandler(analytics.Modes.Operations),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({
    operation: AccountActions.getLogs,
  }),
  express.json(),
  validate_schema({ query: require('./validation/logs'), body: require('./validation/logs') }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].post_logs_query(req, res, next),
  analytics.finished
);

router.options(logRoutesGet, cors(corsManagementOptions));
router.get(
  logRoutesGet,
  analytics.enterHandler(analytics.Modes.Operations),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({
    operation: AccountActions.getLogs,
  }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_logs_query(req, res, next),
  analytics.finished
);

// Issuers

router.options('/account/:accountId/issuer', cors(corsManagementOptions));
router.get(
  '/account/:accountId/issuer',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.getIssuer }),
  validate_schema({ query: require('./validation/api_query') }),
  issuer.issuerList(),
  analytics.finished
);

router.options('/account/:accountId/issuer/:issuerId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/issuer/:issuerId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.getIssuer }),
  issuer.issuerGet(),
  analytics.finished
);

router.post(
  '/account/:accountId/issuer/:issuerId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.addIssuer }),
  express.json(),
  validate_schema({ body: require('./validation/issuer') }),
  issuer.issuerPost(),
  analytics.finished
);

router.patch(
  '/account/:accountId/issuer/:issuerId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.updateIssuer }),
  express.json(),
  validate_schema({ body: require('./validation/update_issuer') }),
  issuer.issuerPatch(),
  analytics.finished
);

router.delete(
  '/account/:accountId/issuer/:issuerId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.deleteIssuer }),
  issuer.issuerDelete(),
  analytics.finished
);

// Subscriptions

router.options('/account/:accountId/subscription', cors(corsManagementOptions));
router.post(
  '/account/:accountId/subscription',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.addSubscription }),
  express.json(),
  validate_schema({ body: require('./validation/subscription') }),
  subscription.subscriptionPost(),
  analytics.finished
);

router.options('/account/:accountId/subscription', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.getSubscription }),
  validate_schema({ query: require('./validation/api_query') }),
  subscription.subscriptionList(),
  analytics.finished
);

router.options('/account/:accountId/subscription/:subscriptionId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params'), query: require('./validation/api_query') }),
  authorize({ operation: AccountActions.getSubscription }),
  subscription.subscriptionGet(subscriptionCache),
  analytics.finished
);

// Agent

router.options('/account/:accountId/me', cors(corsManagementOptions));
router.get(
  '/account/:accountId/me',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({}),
  agent.getMe(),
  analytics.finished
);

router.options('/account/:accountId/init', cors(corsManagementOptions));
router.post(
  '/account/:accountId/init',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  express.json(),
  validate_schema({ body: require('./validation/initResolve') }),
  authorize({ resolve: true }),
  agent.initResolve(),
  analytics.finished
);

// Users

router.options('/account/:accountId/user', cors(corsManagementOptions));
router.get(
  '/account/:accountId/user',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.getUser }),
  validate_schema({ query: require('./validation/api_query') }),
  user.userList(),
  analytics.finished
);

router.post(
  '/account/:accountId/user',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.addUser }),
  express.json(),
  validate_schema({ body: require('./validation/user') }),
  user.userPost(),
  analytics.finished
);

router.options('/account/:accountId/user/:userId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/user/:userId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.getUser }),
  user.userGet(),
  analytics.finished
);

router.patch(
  '/account/:accountId/user/:userId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.updateUser }),
  express.json(),
  validate_schema({ body: require('./validation/update_user') }),
  user.userPatch(),
  analytics.finished
);

router.delete(
  '/account/:accountId/user/:userId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.deleteUser }),
  user.userDelete(),
  analytics.finished
);

router.options('/account/:accountId/user/:userId/init', cors(corsManagementOptions));
router.post(
  '/account/:accountId/user/:userId/init',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.initUser }),
  express.json(),
  validate_schema({ body: require('./validation/init') }),
  user.userInit(),
  analytics.finished
);

// Clients

router.options('/account/:accountId/client', cors(corsManagementOptions));
router.get(
  '/account/:accountId/client',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.getClient }),
  validate_schema({ query: require('./validation/api_query') }),
  client.clientList(),
  analytics.finished
);

router.post(
  '/account/:accountId/client',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.addClient }),
  express.json(),
  validate_schema({ body: require('./validation/client') }),
  client.clientPost(),
  analytics.finished
);

router.options('/account/:accountId/client/:clientId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/client/:clientId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.getClient }),
  client.clientGet(),
  analytics.finished
);

router.patch(
  '/account/:accountId/client/:clientId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.updateClient }),
  express.json(),
  validate_schema({ body: require('./validation/update_client') }),
  client.clientPatch(),
  analytics.finished
);

router.delete(
  '/account/:accountId/client/:clientId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.deleteClient }),
  client.clientDelete(),
  analytics.finished
);

router.options('/account/:accountId/client/:clientId/init', cors(corsManagementOptions));
router.post(
  '/account/:accountId/client/:clientId/init',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: AccountActions.initClient }),
  express.json(),
  validate_schema({ body: require('./validation/init') }),
  client.clientInit(),
  analytics.finished
);

// Boundaries

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:get' }),
  validate_schema({ query: require('./validation/api_query') }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].list_functions(req, res, next),
  analytics.finished
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/log',
  cors(corsManagementOptions)
);

router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/log',
  analytics.enterHandler(analytics.Modes.Operations),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({
    operation: 'function:get-log',
    getToken: (req) => req.query && req.query.token,
  }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_logs(req, res, next),
  analytics.finished
);

// Functions

router.options('/account/:accountId/subscription/:subscriptionId/function', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId/function',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:get' }),
  validate_schema({ query: require('./validation/api_query') }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].list_functions(req, res, next),
  analytics.finished
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_function(req, res, next),
  analytics.finished
);
router.put(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:put' }),
  express.json({ limit: process.env.FUNCTION_SIZE_LIMIT || '500kb' }),
  validate_schema({ body: require('./validation/function_specification') }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  subCache.get(subscriptionCache),
  (req, res, next) => {
    req.keyStore = keyStore;
    next();
  },
  (req, res, next) => provider_handlers[req.provider].put_function(req, res, next),
  analytics.finished
);
router.delete(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:delete' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].delete_function(req, res, next),
  analytics.finished
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/task/:taskId',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/task/:taskId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:schedule' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_task(req, res, next),
  analytics.finished
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/log',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/log',
  analytics.enterHandler(analytics.Modes.Operations),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({
    operation: 'function:get-log',
    getToken: (req) => req.query && req.query.token,
  }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_logs(req, res, next),
  analytics.finished
);
router.post(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/log',
  analytics.enterHandler(analytics.Modes.Operations),
  cors(corsManagementOptions),
  authorize({ operation: Constants.Permissions.logFunction }),
  express.json(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].post_logs(req, res, next),
  analytics.finished
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/location',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/location',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_location(req, res, next),
  analytics.finished
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/redirect',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/redirect',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  loadSummary(),
  redirect.get(),
  analytics.finished
);
router.post(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/redirect',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:redirect' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  express.json(),
  validate_schema({ body: require('./validation/redirect') }),
  redirect.post(),
  analytics.finished
);
router.delete(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/redirect',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:redirect' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  redirect.delete(),
  analytics.finished
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/build',
  cors(corsManagementOptions)
);
router.post(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/build',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:put' }),
  express.json({ limit: '0kb' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  (req, res, next) => provider_handlers[req.provider].post_function_build(req, res, next),
  analytics.finished
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/build/:buildId',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/build/:buildId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'function:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_function_build(req, res, next),
  analytics.finished
);

// Storage

// This is the logic to process the URL path subordinate to ".../storage":
// Matches GET and LIST API paths:
// /account/:accountId/subscription/:subscriptionId/storage (list)
// /account/:accountId/subscription/:subscriptionId/storage/ (list)
// /account/:accountId/subscription/:subscriptionId/storage/* (list)
// /account/:accountId/subscription/:subscriptionId/storage/*/ (list)
// /account/:accountId/subscription/:subscriptionId/storage/p1/p2/.../pN (get)
// /account/:accountId/subscription/:subscriptionId/storage/p1/p2/.../pN/ (get)
// /account/:accountId/subscription/:subscriptionId/storage/p1/p2/.../pN/* (list)
// /account/:accountId/subscription/:subscriptionId/storage/p1/p2/.../pN/*/ (list)
// Matches PUT API paths:
// /account/:accountId/subscription/:subscriptionId/storage/p1/p2/.../pN (put)
// /account/:accountId/subscription/:subscriptionId/storage/p1/p2/.../pN/ (put)
// Matches DELETE API paths:
// /account/:accountId/subscription/:subscriptionId/storage/p1/p2/.../pN (delete)
// /account/:accountId/subscription/:subscriptionId/storage/p1/p2/.../pN/ (delete)
// /account/:accountId/subscription/:subscriptionId/storage/p1/p2/.../pN/* (delete recursive)
// /account/:accountId/subscription/:subscriptionId/storage/p1/p2/.../pN/*/ (delete recursive)
const promote_storage_params = (req, res, next) => {
  const storagePath = req.params[0];
  delete req.params[0];
  if (storagePath.length === 0 || storagePath[0] === '/') {
    // Set recursive flag depending on the presence of trailing `*` or `*/`:
    req.params.recursive = !!storagePath.match(/\*\/?$/);
    // Set storageId such that:
    // 1. There is no leading slash ("p1/p2/...")
    // 2. The trailing `*` or `*/` are removed
    // 3. There is a trailing slash (".../pN/") if the storagePath is recursive
    // 4. There is no trailing slash (".../pN") if the storagePath is not recursive
    req.params.storageId = storagePath.replace(/(((\/)\*)?\/?)$/, '$3').substring(1);
  } else {
    // ".../storagefoobar"
    return next(create_error(404));
  }
  next();
};

const storage_get = storage.storageGet();
const storage_list = storage.storageList();

router.options('/account/:accountId/subscription/:subscriptionId/storage*', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId/storage*',
  promote_storage_params,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params'), query: require('./validation/api_query') }),
  authorize({ operation: StorageActions.getStorage }),
  (req, res, next) =>
    (req.params.recursive || req.params.storageId === '' ? storage_list : storage_get)(req, res, next),
  analytics.finished
);

router.put(
  '/account/:accountId/subscription/:subscriptionId/storage*',
  promote_storage_params,
  (req, res, next) => (req.params.recursive || req.params.storageId === '' ? next(create_error(404)) : next()),
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: StorageActions.putStorage }),
  express.json({ limit: 500 * 1024 }),
  validate_schema({ body: require('./validation/storage') }),
  storage.storagePut(),
  analytics.finished
);

router.delete(
  '/account/:accountId/subscription/:subscriptionId/storage*',
  promote_storage_params,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: StorageActions.deleteStorage }),
  storage.storageDelete(),
  analytics.finished
);

// Statistics reports, general purpose, for specific statisticsKey reports.

const statisticsUrl = 'statistics/:statisticsKey';
router.options('/account/:accountId/' + statisticsUrl, cors(corsManagementOptions));
router.get(
  '/account/:accountId/' + statisticsUrl,
  analytics.enterHandler(analytics.Modes.Operations),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params'), query: require('./validation/statistics_query') }),
  authorize({ operation: 'function:get' }),
  statistics.statisticsGet(),
  analytics.finished
);

router.options('/account/:accountId/subscription/:subscriptionId/' + statisticsUrl, cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId/' + statisticsUrl,
  analytics.enterHandler(analytics.Modes.Operations),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params'), query: require('./validation/statistics_query') }),
  authorize({ operation: 'function:get' }),
  statistics.statisticsGet(),
  analytics.finished
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/' + statisticsUrl,
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/' + statisticsUrl,
  analytics.enterHandler(analytics.Modes.Operations),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params'), query: require('./validation/statistics_query') }),
  authorize({ operation: 'function:get' }),
  statistics.statisticsGet(),
  analytics.finished
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/' + statisticsUrl,
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/' + statisticsUrl,
  analytics.enterHandler(analytics.Modes.Operations),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params'), query: require('./validation/statistics_query') }),
  authorize({ operation: 'function:get' }),
  statistics.statisticsGet(),
  analytics.finished
);

// Registry Service
const registryBase = '/account/:accountId/registry/:registryId';

router.options(registryBase, cors(corsManagementOptions));
router.get(
  registryBase,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/api_params') }),
  authorize({ operation: 'registry:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  async (req, res, next) => {
    try {
      const config = await req.registry.configGet();
      res.status(200).json({
        ...config,
        url: `${process.env.API_SERVER}/v1${require('url').parse(req.url).pathname}npm/`,
      });
    } catch (e) {
      next(e);
    }
  },
  analytics.finished
);

router.put(
  registryBase,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  authorize({ operation: 'registry-config:put' }),
  express.json(),
  validate_schema({ body: require('./validation/registry_specification') }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  async (req, res, next) => {
    try {
      // Exclude the existing scopes that match the reserved prefix
      const internalConfig = await req.registry.internalConfigGet();

      // Filter out any of the global scopes - allows easy roundtrip by the caller.
      req.body.scopes = req.body.scopes.filter((s) => internalConfig.global.scopes.indexOf(s) === -1);

      // Make sure none of the scopes specified interfere with the reserved scope prefix.
      if (req.body.scopes.filter((s) => s.indexOf(Constants.REGISTRY_RESERVED_SCOPE_PREFIX) !== -1).length > 0) {
        return next(
          create_error(400, `Scopes starting with '${Constants.REGISTRY_RESERVED_SCOPE_PREFIX}' are not allowed`)
        );
      }
      await req.registry.configPut(req.body);
      res.status(200).end();
    } catch (e) {
      next(e);
    }
  },
  analytics.finished
);

// npm Service
const registryNpmBase = registryBase + '/npm';

router.options(registryNpmBase + '/-/version', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/-/version',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.versionGet(),
  analytics.finished
);

router.options(registryNpmBase + '/-/ping', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/-/ping',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.pingGet(),
  analytics.finished
);

router.options(registryNpmBase + '/:scope/:name/-/:scope2/:filename', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/:scope/:name/-/:scope2/:filename',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.tarballGet(),
  analytics.finished
);
router.delete(
  registryNpmBase + '/:scope/:name/-/:scope2/:filename/-rev/:revisionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:put' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  express.json(),
  npmRegistry(),
  npm.tarballDelete(),
  analytics.finished
);

// There is a bug in libnpmpublish that causes the namespace portion of this uri to be duplicated.
// Once the bug is resolved, this route can be safely removed
// PR for libnpmpublish issue: https://github.com/npm/libnpmpublish/pull/18
// Problem exists in libnpm 3.0.1 and libnpmpublish 4.0.0
router.delete(
  registryNpmBase + '/v1' + registryNpmBase + '/:scope/:name/-/:scope2/:filename/-rev/:revisionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:put' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  express.json(),
  npmRegistry(),
  npm.tarballDelete(),
  analytics.finished
);

router.options(registryNpmBase + '/:name', cors(corsManagementOptions));
router.put(
  registryNpmBase + '/:name',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:put' }),
  express.json({ limit: npmPackageSizeLimit }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.packagePut(),
  analytics.finished
);

router.get(
  registryNpmBase + '/:name',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.packageGet(),
  analytics.finished
);

router.options(registryNpmBase + '/:name/-rev/:revisionId', cors(corsManagementOptions));
router.put(
  registryNpmBase + '/:name/-rev/:revisionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:put' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  express.json({ limit: npmPackageSizeLimit }),
  npmRegistry(),
  npm.revisionPut(),
  analytics.finished
);
router.delete(
  registryNpmBase + '/:name/-rev/:revisionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:put' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.revisionDelete(),
  analytics.finished
);

router.options(registryNpmBase + '/-/invalidate/:name', cors(corsManagementOptions));
router.post(
  registryNpmBase + '/-/invalidate/:name',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:put' }),
  express.json(),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.invalidatePost(),
  analytics.finished
);

router.options(registryNpmBase + '/-/package/:name/dist-tags', cors(corsManagementOptions));
router.post(
  registryNpmBase + '/-/package/:name/dist-tags',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:get' }),
  express.json(),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.distTagsGet(),
  analytics.finished
);

router.options(registryNpmBase + '/-/package/:name/dist-tags/:tag', cors(corsManagementOptions));
router.put(
  registryNpmBase + '/-/package/:name/dist-tags/:tag',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:put' }),
  express.json({ limit: npmPackageSizeLimit }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.distTagsPut(),
  analytics.finished
);

router.options(registryNpmBase + '/-/package/:name/dist-tags/:tag', cors(corsManagementOptions));
router.delete(
  registryNpmBase + '/-/package/:name/dist-tags/:tag',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:put' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.distTagsDelete(),
  analytics.finished
);

router.options(registryNpmBase + '/-/api/v1/packages', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/-/api/v1/packages',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.allPackagesGet(),
  analytics.finished
);

router.options(registryNpmBase + '/-/user/:user', cors(corsManagementOptions));
router.put(
  registryNpmBase + '/-/user/:user',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:get' }),
  express.json(),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.loginPut(), // Always will succeed
  analytics.finished
);

router.options(registryNpmBase + '/-/whoami', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/-/whoami',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.whoamiGet(),
  analytics.finished
);

router.options(registryNpmBase + '/-/npm/v1/security/audits', cors(corsManagementOptions));
router.post(
  registryNpmBase + '/-/npm/v1/security/audits',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:get' }),
  express.json(),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.auditPost(),
  analytics.finished
);

router.options(registryNpmBase + '/-/v1/search', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/-/v1/search',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./validation/npm_params') }),
  authorize({ operation: 'registry:get' }),
  user_agent(),
  check_agent_version(),
  determine_provider(),
  npmRegistry(),
  npm.searchGet(),
  analytics.finished
);

// Not part of public contract

let run_route = /^\/run\/([^\/]+)\/([^\/]+)\/([^\/]+).*$/;

function promote_to_name_params(req, res, next) {
  req.params.subscriptionId = req.params[0];
  req.params.boundaryId = req.params[1];
  req.params.functionId = req.params[2];
  req.params.functionPath = req.url.substring(`/run/${req.params[0]}/${req.params[1]}/${req.params[2]}`.length) || '/';

  // Reverse back the run_route base url component.
  req.params.baseUrl = get_function_location(
    req,
    req.params.subscriptionId,
    req.params.boundaryId,
    req.params.functionId
  );

  delete req.params[0];
  delete req.params[1];
  delete req.params[2];

  return next();
}

router.options(run_route, cors(corsExecutionOptions));
['post', 'put', 'patch'].forEach((verb) => {
  router[verb](
    run_route,
    analytics.enterHandler(analytics.Modes.Execution),
    cors(corsExecutionOptions),
    promote_to_name_params,
    validate_schema({ params: require('./validation/api_params') }),
    determine_provider(),
    parse_body_conditional({
      condition: (req) => req.provider === 'lambda',
    }),
    subCache.find(subscriptionCache),
    ratelimit.rateLimit,
    loadSummary(),
    checkAuthorization(authorize),
    enforceNotBeforeHeader,
    execAs(keyStore, isTaskSchedulingRequest),
    addLogging(keyStore, isTaskSchedulingRequest),
    (req, res, next) => provider_handlers[req.provider].execute_function(req, res, next),
    analytics.finished
  );
});

const notATaskSchedulingRequest = () => false;

['delete', 'get', 'head'].forEach((verb) => {
  router[verb](
    run_route,
    analytics.enterHandler(analytics.Modes.Execution),
    cors(corsExecutionOptions),
    promote_to_name_params,
    validate_schema({ params: require('./validation/api_params') }),
    determine_provider(),
    subCache.find(subscriptionCache),
    ratelimit.rateLimit,
    loadSummary(),
    checkAuthorization(authorize),
    execAs(keyStore, notATaskSchedulingRequest),
    addLogging(keyStore, notATaskSchedulingRequest),
    (req, res, next) => provider_handlers[req.provider].execute_function(req, res, next),
    analytics.finished
  );
});
module.exports = router;
