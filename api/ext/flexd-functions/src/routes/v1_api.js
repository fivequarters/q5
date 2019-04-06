var express = require('express');
var router = express.Router();
var determine_provider = require('./middleware/determine_provider');
var parse_body_conditional = require('./middleware/parse_body_conditional');
var provider_handlers = require('./handlers/provider_handlers');
var get_logs = require('./handlers/get_logs');
var validate_schema = require('./middleware/validate_schema');
var authorize = require('./middleware/authorize');
var cors = require('cors');
const create_error = require('http-errors');
let { readAudit } = require('./auditing');
const health = require('./handlers/health');
const account = require('./handlers/account_handlers');

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

// Accounts

router.options('/account', cors(corsManagementOptions));
router.post(
  '/account',
  cors(corsManagementOptions),
  authorize({
    operation: 'global:create-account',
  }),
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
  authorize({
    operation: 'account:get',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  account.accountGet()
);

router.options('/account/:accountId/audit', cors(corsManagementOptions));
router.get(
  '/account/:accountId/audit',
  cors(corsManagementOptions),
  authorize({
    operation: 'audit:get',
  }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  readAudit()
);

// Issuers

router.options('/account/:accountId/issuer', cors(corsManagementOptions));
router.get(
  '/account/:accountId/issuer',
  cors(corsManagementOptions),
  authorize({
    operation: 'account:list-issuer',
  }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  account.issuerList()
);

router.options('/account/:accountId/issuer/:issuerId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/issuer/:issuerId',
  cors(corsManagementOptions),
  authorize({
    operation: 'issuer:get',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  account.issuerGet()
);

router.put(
  '/account/:accountId/issuer/:issuerId',
  cors(corsManagementOptions),
  authorize({
    operation: 'issuer:put',
  }),
  express.json(),
  validate_schema({
    body: require('./schemas/issuer'),
  }),
  account.issuerPut()
);

router.delete(
  '/account/:accountId/issuer/:issuerId',
  cors(corsManagementOptions),
  authorize({
    operation: 'issuer:delete',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  account.issuerDelete()
);

// Subscriptions

router.options('/account/:accountId/subscription', cors(corsManagementOptions));
router.post(
  '/account/:accountId/subscription',
  cors(corsManagementOptions),
  authorize({
    operation: 'global:create-subscription',
  }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/subscription'),
  }),
  account.subscriptionPost()
);

router.options('/account/:accountId/subscription', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription',
  cors(corsManagementOptions),
  authorize({
    operation: 'account:list-subscription',
  }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  account.subscriptionList()
);

router.options('/account/:accountId/subscription/:subscriptionId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/subscription/:subscriptionId',
  cors(corsManagementOptions),
  authorize({
    operation: 'subscription:get',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  account.subscriptionGet()
);

// Users

router.options('/account/:accountId/user', cors(corsManagementOptions));
router.get(
  '/account/:accountId/user',
  cors(corsManagementOptions),
  authorize({
    operation: 'user:list',
  }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  account.userList()
);

router.post(
  '/account/:accountId/user',
  cors(corsManagementOptions),
  authorize({
    operation: 'user:post',
  }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/user'),
  }),
  account.userPost()
);

router.options('/account/:accountId/user/:userId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/user/:userId',
  cors(corsManagementOptions),
  authorize({
    operation: 'user:get',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  account.userGet()
);

router.put(
  '/account/:accountId/user/:userId',
  cors(corsManagementOptions),
  authorize({
    operation: 'user:put',
  }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/user'),
  }),
  account.userPut()
);

router.delete(
  '/account/:accountId/user/:userId',
  cors(corsManagementOptions),
  authorize({
    operation: 'user:delete',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  account.userDelete()
);

router.post(
  '/account/:accountId/user/:userId/init',
  cors(corsManagementOptions),
  authorize({
    operation: 'user:init',
  }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/init'),
  }),
  account.userInit()
);

router.post(
  '/account/:accountId/init',
  cors(corsManagementOptions),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/initResolve'),
  }),
  account.userInitResolve()
);

// Clients

router.options('/account/:accountId/client', cors(corsManagementOptions));
router.get(
  '/account/:accountId/client',
  cors(corsManagementOptions),
  authorize({
    operation: 'client:list',
  }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  account.clientList()
);
router.post(
  '/account/:accountId/client',
  cors(corsManagementOptions),
  authorize({
    operation: 'client:post',
  }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/client'),
  }),
  account.clientPost()
);

router.options('/account/:accountId/client/:clientId', cors(corsManagementOptions));
router.get(
  '/account/:accountId/client/:clientId',
  cors(corsManagementOptions),
  authorize({
    operation: 'client:get',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  account.clientGet()
);
router.put(
  '/account/:accountId/client/:clientId',
  cors(corsManagementOptions),
  authorize({
    operation: 'client:put',
  }),
  express.json(),
  validate_schema({
    params: require('./schemas/api_params'),
    body: require('./schemas/client'),
  }),
  account.clientPut()
);
router.delete(
  '/account/:accountId/client/:clientId',
  cors(corsManagementOptions),
  authorize({
    operation: 'client:delete',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  account.clientDelete()
);

// Boundaries

router.options('/account/:accountId/subscription/:subscriptionId/boundary', cors(corsManagementOptions));
router.get('/account/:accountId/subscription/:subscriptionId/boundary', NotImplemented);

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
  get_logs({ topic: req => `logs:application:${req.params.subscriptionId}:${req.params.boundaryId}:` })
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
  get_logs({
    topic: req => `logs:application:${req.params.subscriptionId}:${req.params.boundaryId}:${req.params.functionId}:`,
  })
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

router.options('/system-logs/:topic', cors(corsManagementOptions));
router.get(
  '/system-logs/:topic',
  cors(corsManagementOptions),
  authorize({
    operation: 'system:logs',
    getToken: req => req.query && req.query.token,
  }),
  get_logs({ topic: req => req.params.topic })
);

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
