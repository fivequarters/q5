var express = require('express');
var router = express.Router();
var determine_provider = require('./middleware/determine_provider');
var parse_body_conditional = require('./middleware/parse_body_conditional');
var provider_handlers = require('./handlers/provider_handlers');
var get_logs = require('./handlers/get_logs');
var validate_schema = require('./middleware/validate_schema');
var authorize = require('./middleware/authorize');
var cors = require('cors');

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

router.options('/function/:boundary/:name', cors(corsManagementOptions));
router.put(
  '/function/:boundary/:name',
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

router.options('/function/:boundary/:name/build/:build_id', cors(corsManagementOptions));
router.get(
  '/function/:boundary/:name/build/:build_id',
  cors(corsManagementOptions),
  authorize({
    operation: 'function:build:get',
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].get_function_build(req, res, next)
);

router.options('/function/:boundary/:name', cors(corsManagementOptions));
router.get(
  '/function/:boundary/:name',
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

router.options('/function/:boundary', cors(corsManagementOptions));
router.get(
  '/function/:boundary',
  cors(corsManagementOptions),
  authorize({
    operation: 'functions:list',
  }),
  validate_schema({
    query: require('./schemas/api_query'),
    params: require('./schemas/api_params'),
  }),
  determine_provider(),
  (req, res, next) => provider_handlers[req.provider].list_functions(req, res, next)
);

router.options('/function/:boundary/:name', cors(corsManagementOptions));
router.delete(
  '/function/:boundary/:name',
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

router.options('/logs/:boundary', cors(corsManagementOptions));
router.get(
  '/logs/:boundary',
  cors(corsManagementOptions),
  authorize({
    operation: 'boundary:logs',
    getToken: req => req.query && req.query.token,
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  get_logs({ topic: req => `logs:application:${req.params.boundary}:` })
);

router.options('/logs/:boundary/:name', cors(corsManagementOptions));
router.get(
  '/logs/:boundary/:name',
  cors(corsManagementOptions),
  authorize({
    operation: 'function:logs',
    getToken: req => req.query && req.query.token,
  }),
  validate_schema({
    params: require('./schemas/api_params'),
  }),
  get_logs({ topic: req => `logs:application:${req.params.boundary}:${req.params.name}:` })
);

let run_route = /^\/run\/([^\/]+)\/([^\/]+).*$/;
function promote_to_name_params(req, res, next) {
  req.params.boundary = req.params[0];
  delete req.params[0];
  req.params.name = req.params[1];
  delete req.params[1];
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
