const Assert = require('assert');
const { request } = require('@5qtrs/request');
var create_error = require('http-errors');

module.exports = function authorize_factory(options) {
  Assert.ok(options, 'options must be provided');
  Assert.equal(typeof options.operation, 'string', 'options.operation must be a string');

  options.getToken = options.getToken || getTokenFromAuthorizationHeader;
  const usersServiceUrl = process.env.USER_SERVICE || 'http://localhost:7000';

  return function authorize(req, res, next) {
    // TODO implement actual authorization by sending resource and action being performed
    const token = options.getToken(req);
    if (token === process.env.API_AUTHORIZATION_KEY) {
      return next();
    }
    const data = { token, subscription: '12345' };
    const url = `${usersServiceUrl}/authorize`;

    request({ method: 'POST', url, data }).then(response => {
      if (response.status !== 200) {
        next(create_error(403));
      } else {
        next();
      }
    });
  };

  function getTokenFromAuthorizationHeader(req) {
    if (req.headers['authorization']) {
      var match = req.headers['authorization'].match(/^\ *bearer\ +(.+)$/i);
      if (match) return match[1];
    }
    return null;
  }
};
