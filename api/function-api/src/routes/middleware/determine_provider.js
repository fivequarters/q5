var createError = require('http-errors');
var provider_handlers = require('../handlers/provider_handlers');

module.exports = function determine_provider_factory() {
  return function determine_provider(req, res, next) {
    // TODO in a general case of multiple providers, the determination of the provider to use for a given request needs to consult the DB
    // - for PUT requests, it is derived from the request body
    // - for :boundary/:name requests, it is derived from function-spec/* keys in S3
    // - for :/boundary/:name/:build_id requests, it is derived from function-build-request/* keys in S3
    // ... cutting some switchbacks here until there is a second provider ...
    req.provider = 'lambda';
    return next();
  };
};
