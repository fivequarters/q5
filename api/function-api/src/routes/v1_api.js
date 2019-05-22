var express = require('express');
var router = express.Router();
var determine_provider = require('./middleware/determine_provider');
var parse_body_conditional = require('./middleware/parse_body_conditional');
var provider_handlers = require('./handlers/provider_handlers');
var validate_schema = require('./middleware/validate_schema');
var authorize = require('./middleware/authorize');
var cors = require('cors');
const create_error = require('http-errors');
const { AccountActions } = require('@5qtrs/account');
const health = require('./handlers/health');
const account = require('./handlers/account');
const subscription = require('./handlers/subscription');
const issuer = require('./handlers/issuer');
const user = require('./handlers/user');
const client = require('./handlers/client');
const init = require('./handlers/init');
const audit = require('./handlers/audit');

var corsManagementOptions = {
  origins: '*',
  methods: 'GET,POST,PUT,DELETE',
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
  authorize({ operation: AccountActions.getIssuer }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  issuer.issuerGet()
);

router.post(
  '/account/:accountId/issuer/:issuerId',
  cors(corsManagementOptions),
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
  authorize({ operation: AccountActions.updateIssuer }),
  express.json(),
  validate_schema({
    body: require('./schemas/issuer'),
  }),
  issuer.issuerPut()
);

router.delete(
  '/account/:accountId/issuer/:issuerId',
  cors(corsManagementOptions),
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
  authorize({ operation: AccountActions.getSubscription }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  subscription.subscriptionGet()
);

// Users

router.options('/account/:accountId/user', cors(corsManagementOptions));
router.get(
  '/account/:accountId/user',
  cors(corsManagementOptions),
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
  authorize({ operation: AccountActions.getUser }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user.userGet()
);

router.put(
  '/account/:accountId/user/:userId',
  cors(corsManagementOptions),
  authorize({ operation: AccountActions.updateUser }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/user'),
  }),
  user.userPut()
);

router.delete(
  '/account/:accountId/user/:userId',
  cors(corsManagementOptions),
  authorize({ operation: AccountActions.deleteUser }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  user.userDelete()
);

router.post(
  '/account/:accountId/user/:userId/init',
  cors(corsManagementOptions),
  authorize({ operation: AccountActions.initUser }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/init'),
  }),
  user.userInit()
);

router.post(
  '/account/:accountId/init',
  cors(corsManagementOptions),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/initResolve'),
  }),
  init.initResolve()
);

// Clients

router.options('/account/:accountId/client', cors(corsManagementOptions));
router.get(
  '/account/:accountId/client',
  cors(corsManagementOptions),
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
  authorize(),
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
  authorize({ operation: AccountActions.getClient }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  client.clientGet()
);
router.put(
  '/account/:accountId/client/:clientId',
  cors(corsManagementOptions),
  authorize({ operation: AccountActions.updateClient }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/client'),
  }),
  client.clientPut()
);
router.delete(
  '/account/:accountId/client/:clientId',
  cors(corsManagementOptions),
  authorize({ operation: AccountActions.deleteClient }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  client.clientDelete()
);

router.post(
  '/account/:accountId/client/:clientId/init',
  cors(corsManagementOptions),
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
  authorize({
    operation: 'function:list',
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
  authorize({
    operation: 'function:list',
  }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
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
  authorize({
    operation: 'function:get',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_function(req, res, next)
);
router.put(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
  cors(corsManagementOptions),
  authorize({
    operation: 'function:put',
  }),
  express.json(),
  validate_schema({
    body: require('./schemas/function_specification'),
    params: require('./schemas/api_params'),
  }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].put_function(req, res, next)
);
router.delete(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId',
  cors(corsManagementOptions),
  authorize({
    operation: 'function:delete',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
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

router.options(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/location',
  cors(corsManagementOptions)
);
router.get(
  '/account/:accountId/subscription/:subscriptionId/boundary/:boundaryId/function/:functionId/location',
  cors(corsManagementOptions),
  authorize({
    operation: 'function:get-location',
  }),
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
  authorize({
    operation: 'function:get-build',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_function_build(req, res, next)
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
