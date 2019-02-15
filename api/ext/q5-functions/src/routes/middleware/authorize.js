const Assert = require('assert');
var create_error = require('http-errors');

module.exports = function authorize_factory(options) {
  Assert.ok(options, 'options must be provided');
  Assert.equal(typeof options.operation, 'string', 'options.operation must be a string');

  options.getToken = options.getToken || getTokenFromAuthorizationHeader;

  return function authorize(req, res, next) {
    // TODO implement isAuthorized pattern instead of the scheme below
    if (process.env.API_AUTHORIZATION_KEY) {
      if (options.getToken(req) === process.env.API_AUTHORIZATION_KEY) {
        return next();
      }
      return next(create_error(403));
    } else {
      return next();
    }
  };

  function getTokenFromAuthorizationHeader(req) {
    if (req.headers['authorization']) {
      var match = req.headers['authorization'].match(/^\ *bearer\ +(.+)$/i);
      if (match) return match[1];
    }
    return null;
  }
};
