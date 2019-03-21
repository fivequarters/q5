
const Assert = require('assert');
const { request } = require('@5qtrs/request');
var create_error = require('http-errors');
const { writeAudit } = require('../auditing');

module.exports = function authorize_factory(options) {
  Assert.ok(options, 'options must be provided');
  Assert.equal(typeof options.operation, 'string', 'options.operation must be a string');

  options.getToken = options.getToken || getTokenFromAuthorizationHeader;
  const usersServiceUrl = process.env.USER_SERVICE || 'http://localhost:7000';

  return function authorize(req, res, next) {
    // TODO implement actual authorization by sending resource and action being performed
    const token = options.getToken(req);
    if (token === process.env.API_AUTHORIZATION_KEY) {
      return writeAudit({
        // TODO where do we obtain accountId from for requests where it is implied by subscriptionId?
        accountId: req.params.accountId || req.params.subscriptionId || 'NONE',
        issuer: 'flexd:root',
        subject: 'flexd:root',
        action: options.operation,
        resource: req.path,
      }, next);
    }
    const data = { token, subscription: '12345' };
    const url = `${usersServiceUrl}/authorize`;
    request({
      method: 'POST',
      url,
      data,
      validateStatus: status => (status >= 200 && status < 300) || status === 403,
    })
      .then(response => {
        if (response.status !== 200) {
          next(create_error(403));
        } else {
          // TODO randall, move auditing his to user-api
          return writeAudit({
            accountId: response.data.accountId || 'NONE',
            issuer: response.data.iss,
            subject: response.data.sub,
            action: options.operation,
            resource: req.path,
          }, next);    
        }
      })
      .catch(e => {
        next(create_error(500, 'Unable to authenticate the caller: ' + e.message));
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
