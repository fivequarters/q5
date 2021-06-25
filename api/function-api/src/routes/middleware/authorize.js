const create_error = require('http-errors');

const { getResolvedAgent, validateAccessToken, validateAccessTokenSignature, errorHandler } = require('../account');
const { meterApiCall } = require('@5qtrs/bq-metering');

const meteringEnabled = process.env.METERING_ENABLED === 'false' ? false : true;

module.exports = function authorize_factory(options) {
  return async function authorize(req, res, next) {
    let match;
    if (req.headers['authorization']) {
      match = req.headers['authorization'].match(/^\ *bearer\ +(.+)$/i);
    }

    let token = match ? match[1] : undefined;
    if (!token && options.getToken) {
      token = options.getToken(req);
    }

    if (!token) {
      return next(create_error(403, 'Unauthorized'));
    }

    if (options.resolve) {
      req.token = token;
      if (req.body && req.body.accessToken) {
        if (req.body.protocol === 'oauth') {
          try {
            req.body.decodedAccessToken = await validateAccessToken(req.params.accountId, req.body.accessToken);
            if (!req.body.decodedAccessToken) {
              throw new Error('Unauthorized');
            }
          } catch (_) {
            return next(create_error(403, 'Unauthorized'));
          }
        } else if (req.body.protocol === 'pki' && req.body.publicKey) {
          try {
            req.body.decodedAccessToken = await validateAccessTokenSignature(req.body.accessToken, req.body.publicKey);
            if (!req.body.decodedAccessToken) {
              throw new Error('Unauthorized');
            }
          } catch (_) {
            return next(create_error(403, 'Unauthorized'));
          }
        } else {
          return next(create_error(400, 'Invalid request'));
        }
      }
      return next();
    }

    const accountId = req.headers['fusebit-authorization-account-id'] || req.params.accountId;

    try {
      const resolvedAgent = await getResolvedAgent(accountId, token);

      req.resolvedAgent = resolvedAgent;
      if (options && options.operation) {
        const pathMatch = (req.baseUrl + req.path).match('^/v[0-9]+(.*)');
        if (!pathMatch) {
          throw create_error(400, 'Invalid request');
        }
        const resource = pathMatch[1];
        const action = options.operation;
        const { issuerId, subject } = resolvedAgent.identities[0];

        await resolvedAgent.ensureAuthorized(action, resource);
        if (meteringEnabled) {
          meterApiCall({
            deploymentId: process.env.DEPLOYMENT_KEY,
            accountId,
            issuer: issuerId,
            subject: subject,
            action,
            resource,
            subscriptionId: req.params.subscriptionId,
            boundaryId: req.params.boundaryId,
            functionId: req.params.functionId,
            issuerId: req.params.issuerId,
            agentId: req.params.userId || req.params.clientId,
            userAgent: req.headers['x-user-agent'] || req.headers['user-agent'],
          });
        }
      }
    } catch (error) {
      console.log(error);
      if (options.failByCallback) {
        return next(error);
      }
      return errorHandler(res)(error);
    }
    return next();
  };
};
