const express = require('express');
const router = express.Router();
const determine_provider = require('./middleware/determine_provider');
const parse_body_conditional = require('./middleware/parse_body_conditional');
const provider_handlers = require('./handlers/provider_handlers');
const validate_schema = require('./middleware/validate_schema');
const authorize = require('./middleware/authorize');
const user_agent = require('./middleware/user_agent');
const cors = require('cors');
const create_error = require('http-errors');
const health = require('./handlers/health');

const { AccountActions } = require('@5qtrs/account');
const account = require('./handlers/account');
const subscription = require('./handlers/subscription');
const issuer = require('./handlers/issuer');
const user = require('./handlers/user');
const client = require('./handlers/client');
const agent = require('./handlers/agent');
const audit = require('./handlers/audit');

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

const NotImplemented = (_, __, next) => next(create_error(501, 'Not implemented'));

// Health

router.get('/health', health.getHealth());

// Real-time logs from execution

router.post(
  '/internal/logs',
  authorize({
    logs: true,
  }),
  express.json(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].post_logs(req, res, next)
);

// Accounts

router.options('/account', cors(corsManagementOptions));
router.post(
  '/account',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.addAccount }),
  express.json(),
  validate_schema({
    body: require('./schemas/account'),
  }),
  account.accountPost()
);

router.options('/account/:accountId', cors(corsManagementOptions));
router.get(
  '/account/:accountId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getAccount }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  account.accountGet()
);

router.options('/account/:accountId/audit', cors(corsManagementOptions));
router.get(
  '/account/:accountId/audit',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getAudit }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  audit.auditGet()
);

// Issuers

router.options('/account/:accountId/issuer', cors(corsManagementOptions));
router.get(
  '/account/:accountId/issuer',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getIssuer }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  issuer.issuerList()
);

router.options('/account/:accountId/issuer/:issuerId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/issuer/:issuerId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getIssuer }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  issuer.issuerGet()
);

router.post(
  '/account/:accountId/issuer/:issuerId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.addIssuer }),
  express.json(),
  validate_schema({
    body: require('./schemas/issuer'),
  }),
  issuer.issuerPost()
);

router.patch(
  '/account/:accountId/issuer/:issuerId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.updateIssuer }),
  express.json(),
  validate_schema({
    body: require('./schemas/update_issuer'),
  }),
  issuer.issuerPatch()
);

router.delete(
  '/account/:accountId/issuer/:issuerId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.deleteIssuer }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  issuer.issuerDelete()
);

// Subscriptions

router.options('/account/:accountId/subscription', cors(corsManagementOptions));
router.post(
  '/account/:accountId/subscription',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.addSubscription }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/subscription'),
  }),
  subscription.subscriptionPost()
);

router.options('/account/:accountId/subscription', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getSubscription }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  subscription.subscriptionList()
);

router.options('/account/:accountId/subscription/:subscriptionId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getSubscription }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  subscription.subscriptionGet()
);

// Agent

router.options('/account/:accountId/me', cors(corsManagementOptions));
router.get(
  '/account/:accountId/me',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({}),
  agent.getMe()
);

router.options('/account/:accountId/init', cors(corsManagementOptions));
router.post(
  '/account/:accountId/init',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ resolve: true }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/initResolve'),
  }),
  agent.initResolve()
);

// Users

router.options('/account/:accountId/user', cors(corsManagementOptions));
router.get(
  '/account/:accountId/user',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getUser }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  user.userList()
);

router.post(
  '/account/:accountId/user',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.addUser }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/user'),
  }),
  user.userPost()
);

router.options('/account/:accountId/user/:userId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/user/:userId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getUser }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user.userGet()
);

router.patch(
  '/account/:accountId/user/:userId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.updateUser }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/update_user'),
  }),
  user.userPatch()
);

router.delete(
  '/account/:accountId/user/:userId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.deleteUser }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user.userDelete()
);

router.options('/account/:accountId/user/:userId/init', cors(corsManagementOptions));
router.post(
  '/account/:accountId/user/:userId/init',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.initUser }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/init'),
  }),
  user.userInit()
);

// Clients

router.options('/account/:accountId/client', cors(corsManagementOptions));
router.get(
  '/account/:accountId/client',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getClient }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  client.clientList()
);
router.post(
  '/account/:accountId/client',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.addClient }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/client'),
  }),
  client.clientPost()
);

router.options('/account/:accountId/client/:clientId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/client/:clientId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.getClient }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  client.clientGet()
);
router.patch(
  '/account/:accountId/client/:clientId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.updateClient }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/update_client'),
  }),
  client.clientPatch()
);
router.delete(
  '/account/:accountId/client/:clientId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.deleteClient }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  client.clientDelete()
);

router.options('/account/:accountId/client/:clientId/init', cors(corsManagementOptions));
router.post(
  '/account/:accountId/client/:clientId/init',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: AccountActions.initClient }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/init'),
  }),
  client.clientInit()
);

// Boundaries

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function',
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
  (req, res, next) => provider_handlers[req.provider].list_functions(req, res, next)
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/log',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/log',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:get-log',
    getToken: req => req.query && req.query.token,
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_logs(req, res, next)
);

// Functions

router.options('/account/:accountId/subscription/:subscriptionId/function', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId/function',
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
  (req, res, next) => provider_handlers[req.provider].list_functions(req, res, next)
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
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
  (req, res, next) => provider_handlers[req.provider].get_function(req, res, next)
);
router.put(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:put',
  }),
  express.json({ limit: process.env.FUNCTION_SIZE_LIMIT || '100kb' }),
  validate_schema({
    body: require('./schemas/function_specification'),
    params: require('./schemas/api_params'),
  }),
  user_agent(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].put_function(req, res, next)
);
router.delete(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
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
  (req, res, next) => provider_handlers[req.provider].delete_function(req, res, next)
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/log',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/log',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({
    operation: 'function:get-log',
    getToken: req => req.query && req.query.token,
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user_agent(),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_logs(req, res, next)
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/location',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/location',
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
  (req, res, next) => provider_handlers[req.provider].get_location(req, res, next)
);

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/build/:buildId',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/build/:buildId',
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
  (req, res, next) => provider_handlers[req.provider].get_function_build(req, res, next)
);

// Storage

router.options('/account/:accountId/subscription/:subscriptionId/storage', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId/storage',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: StorageActions.getStorage }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  storage.storageList()
);

router.options('/account/:accountId/subscription/:subscriptionId/storage/:storageId*', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId/storage/:storageId*',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: StorageActions.getStorage }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  storage.storageGet()
);

router.put(
  '/account/:accountId/subscription/:subscriptionId/storage/:storageId*',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: StorageActions.putStorage }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/storage'),
  }),
  storage.storagePut()
);

router.delete(
  '/account/:accountId/subscription/:subscriptionId/storage/:storageId*',
  cors(corsManagementOptions),
  validate_schema({ params: require('./schemas/api_account') }),
  authorize({ operation: StorageActions.deleteStorage }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  storage.storageDelete()
);

// Not part of public contract

let run_route = /^\/run\/([^\/]+)\/([^\/]+)\/([^\/]+).*$/;
function promote_to_name_params(req, res, next) {
  req.params.subscriptionId = req.params[0];
  req.params.boundaryId = req.params[1];
  req.params.functionId = req.params[2];
  delete req.params[0];
  delete req.params[1];
  delete req.params[2];
  return next();
}

router.options(run_route, cors(corsExecutionOptions));

['post', 'put', 'patch'].forEach(verb => {
  router[verb](
    run_route,
    cors(corsExecutionOptions),
    promote_to_name_params,
    validate_schema({
      params: require('./schemas/api_params'),
    }),
    determine_provider(),
    parse_body_conditional({
      condition: req => req.provider === 'lambda',
    }),
    (req, res, next) => provider_handlers[req.provider].execute_function(req, res, next)
  );
});

['delete', 'get', 'head'].forEach(verb => {
  router[verb](
    run_route,
    cors(corsExecutionOptions),
    promote_to_name_params,
    validate_schema({
      params: require('./schemas/api_params'),
    }),
    determine_provider(),
    (req, res, next) => provider_handlers[req.provider].execute_function(req, res, next)
  );
});

module.exports = router;
