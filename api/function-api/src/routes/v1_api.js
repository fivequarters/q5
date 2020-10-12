const express = require('express');
const router = express.Router();
const analytics = require('./middleware/analytics');
const determine_provider = require('./middleware/determine_provider');
const parse_body_conditional = require('./middleware/parse_body_conditional');
const provider_handlers = require('./handlers/provider_handlers');
const validate_schema = require('./middleware/validate_schema');
const authorize = require('./middleware/authorize');
const user_agent = require('./middleware/user_agent');
const cors = require('cors');
const create_error = require('http-errors');
const health = require('./handlers/health');
const { get_function_location } = require('@5qtrs/constants');

const AWS = require('aws-sdk');
//AWS.config.logger = console;

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
const { AWSRegistry } = require('@5qtrs/registry');

const { StorageActions } = require('@5qtrs/storage');
const storage = require('./handlers/storage');

var corsManagementOptions = {
  origins: '*',
  methods: 'GET,POST,PUT,DELETE,PATCH',
  exposedHeaders: 'x-fx-logs,x-fx-response-source,content-length',
  credentials: true,
};

var corsExecutionOptions = {
  origins: '*',
  methods: 'GET,POST,PUT,DELETE,PATCH,HEAD',
  exposedHeaders: 'x-fx-logs,x-fx-response-source,content-length',
  credentials: true,
};

const npmRegistry = AWSRegistry;

const NotImplemented = (_, __, next) => next(create_error(501, 'Not implemented'));

// Health

router.get('/health', health.getHealth());

// Real-time logs from execution

router.post(
  '/internal/logs',
  analytics.enterHandler(analytics.Modes.Operations),
  authorize({
    logs: true,
  }),
  express.json(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].post_logs(req, res, next),
  analytics.finished
);

// Accounts

router.options('/account', cors(corsManagementOptions));
router.post(
  '/account',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.addAccount }),
  express.json(),
  validate_schema({
    body: require('./schemas/account'),
  }),
  account.accountPost(),
  analytics.finished
);

router.options('/account/:accountId', cors(corsManagementOptions));
router.get(
  '/account/:accountId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getAccount }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  account.accountGet(),
  analytics.finished
);

router.options('/account/:accountId/audit', cors(corsManagementOptions));
router.get(
  '/account/:accountId/audit',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getAudit }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  audit.auditGet(),
  analytics.finished
);

// Issuers

router.options('/account/:accountId/issuer', cors(corsManagementOptions));
router.get(
  '/account/:accountId/issuer',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getIssuer }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  issuer.issuerList(),
  analytics.finished
);

router.options('/account/:accountId/issuer/:issuerId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/issuer/:issuerId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getIssuer }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  issuer.issuerGet(),
  analytics.finished
);

router.post(
  '/account/:accountId/issuer/:issuerId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.addIssuer }),
  express.json(),
  validate_schema({
    body: require('./schemas/issuer'),
  }),
  issuer.issuerPost(),
  analytics.finished
);

router.patch(
  '/account/:accountId/issuer/:issuerId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.updateIssuer }),
  express.json(),
  validate_schema({
    body: require('./schemas/update_issuer'),
  }),
  issuer.issuerPatch(),
  analytics.finished
);

router.delete(
  '/account/:accountId/issuer/:issuerId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.deleteIssuer }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  issuer.issuerDelete(),
  analytics.finished
);

// Subscriptions

router.options('/account/:accountId/subscription', cors(corsManagementOptions));
router.post(
  '/account/:accountId/subscription',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.addSubscription }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/subscription'),
  }),
  subscription.subscriptionPost(),
  analytics.finished
);

router.options('/account/:accountId/subscription', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getSubscription }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  subscription.subscriptionList(),
  analytics.finished
);

router.options('/account/:accountId/subscription/:subscriptionId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getSubscription }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  subscription.subscriptionGet(),
  analytics.finished
);

// Agent

router.options('/account/:accountId/me', cors(corsManagementOptions));
router.get(
  '/account/:accountId/me',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({}),
  agent.getMe(),
  analytics.finished
);

router.options('/account/:accountId/init', cors(corsManagementOptions));
router.post(
  '/account/:accountId/init',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/initResolve'),
  }),
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
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getUser }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  user.userList(),
  analytics.finished
);

router.post(
  '/account/:accountId/user',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.addUser }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/user'),
  }),
  user.userPost(),
  analytics.finished
);

router.options('/account/:accountId/user/:userId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/user/:userId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getUser }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user.userGet(),
  analytics.finished
);

router.patch(
  '/account/:accountId/user/:userId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.updateUser }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/update_user'),
  }),
  user.userPatch(),
  analytics.finished
);

router.delete(
  '/account/:accountId/user/:userId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.deleteUser }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user.userDelete(),
  analytics.finished
);

router.options('/account/:accountId/user/:userId/init', cors(corsManagementOptions));
router.post(
  '/account/:accountId/user/:userId/init',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.initUser }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/init'),
  }),
  user.userInit(),
  analytics.finished
);

// Clients

router.options('/account/:accountId/client', cors(corsManagementOptions));
router.get(
  '/account/:accountId/client',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getClient }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  client.clientList(),
  analytics.finished
);

router.post(
  '/account/:accountId/client',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.addClient }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/client'),
  }),
  client.clientPost(),
  analytics.finished
);

router.options('/account/:accountId/client/:clientId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/client/:clientId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getClient }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  client.clientGet(),
  analytics.finished
);

router.patch(
  '/account/:accountId/client/:clientId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.updateClient }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/update_client'),
  }),
  client.clientPatch(),
  analytics.finished
);

router.delete(
  '/account/:accountId/client/:clientId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.deleteClient }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  client.clientDelete(),
  analytics.finished
);

router.options('/account/:accountId/client/:clientId/init', cors(corsManagementOptions));
router.post(
  '/account/:accountId/client/:clientId/init',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.initClient }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/init'),
  }),
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
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:get',
  }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
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
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:get-log',
    getToken: (req) => req.query && req.query.token,
  }),
  validate_schema({
    params: require('./schemas/api_params'),
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
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:get',
  }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  user_agent(),
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
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:get',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user_agent(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_function(req, res, next),
  analytics.finished
);
router.put(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:put',
  }),
  express.json({ limit: process.env.FUNCTION_SIZE_LIMIT || '500kb' }),
  validate_schema({
    body: require('./schemas/function_specification'),
    params: require('./schemas/api_params'),
  }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  (req, res, next) => provider_handlers[req.provider].put_function(req, res, next),
  analytics.finished
);
router.delete(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:delete',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user_agent(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].delete_function(req, res, next),
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
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:get-log',
    getToken: (req) => req.query && req.query.token,
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user_agent(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_logs(req, res, next),
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
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:get',
  }),
  user_agent(),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_location(req, res, next),
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
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:get',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user_agent(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_function_build(req, res, next),
  analytics.finished
);

// Storage

router.options('/account/:accountId/subscription/:subscriptionId/storage', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId/storage',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: StorageActions.getStorage }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  storage.storageList(),
  analytics.finished
);

router.options('/account/:accountId/subscription/:subscriptionId/storage/:storageId*', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId/storage/:storageId*',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: StorageActions.getStorage }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  storage.storageGet(),
  analytics.finished
);

router.put(
  '/account/:accountId/subscription/:subscriptionId/storage/:storageId*',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: StorageActions.putStorage }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/storage'),
  }),
  storage.storagePut(),
  analytics.finished
);

router.delete(
  '/account/:accountId/subscription/:subscriptionId/storage/:storageId*',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: StorageActions.deleteStorage }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
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
  validate_schema({ params: require('./schemas/api_account'), query: require('./schemas/statistics_query') }),
  authorize({ operation: 'function:get' }),
  validate_schema({ params: require('./schemas/api_params') }),
  statistics.statisticsGet(),
  analytics.finished
);

router.options('/account/:accountId/subscription/:subscriptionId/' + statisticsUrl, cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId/' + statisticsUrl,
  analytics.enterHandler(analytics.Modes.Operations),
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account'), query: require('./schemas/statistics_query') }),
  authorize({ operation: 'function:get' }),
  validate_schema({ params: require('./schemas/api_params') }),
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
  validate_schema({ params: require('./schemas/api_account'), query: require('./schemas/statistics_query') }),
  authorize({ operation: 'function:get' }),
  validate_schema({ params: require('./schemas/api_params') }),
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
  validate_schema({ params: require('./schemas/api_account'), query: require('./schemas/statistics_query') }),
  authorize({ operation: 'function:get' }),
  validate_schema({ params: require('./schemas/api_params') }),
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
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:get' }),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  async (req, res) =>
    res.status(200).json({
      ...(await req.registry.configGet()),
      url: process.env.API_SERVER + req.originalUrl + 'npm/',
    }),
  analytics.finished
);

router.options(registryBase, cors(corsManagementOptions));
router.put(
  registryBase,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:put' }),
  express.json(),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  async (req, res) => {
    console.log(req);
    await req.registry.configPut(req.body);
    res.status(200).end();
  },
  analytics.finished
);

// NPM Service
const registryNpmBase = registryBase + '/npm';

const logEvent = (req, res, next) => {
  /* XXX XXX XXX XXX */
  console.log(
    `\n` +
      `${req.method} ${req.url}\n${JSON.stringify(req.headers, null, 2)}\n` +
      `${JSON.stringify(req.params, null, 2)}\n` +
      `${JSON.stringify(req.body, null, 2)}\n` +
      `${JSON.stringify(req.json, null, 2)}\n`
  );
  return next();
};

router.options(registryNpmBase + '/-/version', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/-/version',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:get' }),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.versionGet(),
  analytics.finished
);

router.options(registryNpmBase + '/-/ping', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/-/ping',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:get' }),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.pingGet(),
  analytics.finished
);

router.options(registryNpmBase + '/:scope?/:name/-/:scope2?/:filename/:sha?', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/:scope?/:name/-/:scope2?/:filename/:sha',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:get' }),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.tarballGet(),
  analytics.finished
);

router.options(registryNpmBase + '/:name', cors(corsManagementOptions));
router.put(
  registryNpmBase + '/:name',
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:put' }),
  express.json(),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  logEvent,
  npm.packagePut(),
  analytics.finished
);

router.options(registryNpmBase + '/:name', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/:name',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:put' }),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.packageGet(),
  analytics.finished
);

router.options(registryNpmBase + '/-/invalidate/:name', cors(corsManagementOptions));
router.post(
  registryNpmBase + '/-/invalidate/:name',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:put' }),
  express.json(),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.invalidatePost(),
  analytics.finished
);

router.options(registryNpmBase + '/-/package/:name/dist-tags', cors(corsManagementOptions));
router.post(
  registryNpmBase + '/-/package/:name/dist-tags',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:put' }),
  express.json(),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.distTagsGet(),
  analytics.finished
);

router.options(registryNpmBase + '/-/package/:name/dist-tags/:tag', cors(corsManagementOptions));
router.put(
  registryNpmBase + '/-/package/:name/dist-tags/:tag',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:put' }),
  express.json(),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.distTagsPut(),
  analytics.finished
);

router.options(registryNpmBase + '/-/package/:name/dist-tags/:tag', cors(corsManagementOptions));
router.delete(
  registryNpmBase + '/-/package/:name/dist-tags/:tag',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:put' }),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.distTagsDelete(),
  analytics.finished
);

router.options(registryNpmBase + '/-/api/v1/packages', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/-/api/v1/packages',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:get' }),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.allPackagesGet(),
  analytics.finished
);

router.options(registryNpmBase + '/-/user/:user', cors(corsManagementOptions));
router.put(
  registryNpmBase + '/-/user/:user',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:get' }),
  express.json(),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.loginPut(), // Always will succeed
  analytics.finished
);

router.options(registryNpmBase + '/-/whoami', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/-/whoami',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:get' }),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.whoamiGet(),
  analytics.finished
);

router.options(registryNpmBase + '/-/npm/v1/security/audits', cors(corsManagementOptions));
router.post(
  registryNpmBase + '/-/npm/v1/security/audits',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:get' }),
  express.json(),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.auditPost(),
  analytics.finished
);

router.options(registryNpmBase + '/-/v1/search', cors(corsManagementOptions));
router.get(
  registryNpmBase + '/-/v1/search',
  logEvent,
  analytics.enterHandler(analytics.Modes.Administration),
  cors(corsManagementOptions),
  //validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: 'registry:get' }),
  //validate_schema({ params: require('./schemas/api_params'), }),
  user_agent(),
  determine_provider(),
  npmRegistry.handler(),
  npm.searchGet(),
  analytics.finished
);

// Not part of public contract

let run_route = /^\/run\/([^\/]+)\/([^\/]+)\/([^\/]+).*$/;
function promote_to_name_params(req, res, next) {
  req.params.subscriptionId = req.params[0];
  req.params.boundaryId = req.params[1];
  req.params.functionId = req.params[2];
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
    validate_schema({
      params: require('./schemas/api_params'),
    }),
    determine_provider(),
    parse_body_conditional({
      condition: (req) => req.provider === 'lambda',
    }),
    (req, res, next) => provider_handlers[req.provider].execute_function(req, res, next),
    analytics.finished
  );
});

['delete', 'get', 'head'].forEach((verb) => {
  router[verb](
    run_route,
    analytics.enterHandler(analytics.Modes.Execution),
    cors(corsExecutionOptions),
    promote_to_name_params,
    validate_schema({
      params: require('./schemas/api_params'),
    }),
    determine_provider(),
    (req, res, next) => provider_handlers[req.provider].execute_function(req, res, next),
    analytics.finished
  );
});

module.exports = router;
