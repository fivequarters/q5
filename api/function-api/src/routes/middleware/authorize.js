const { getResolvedAgent, validateAccessToken, validateAccessTokenSignature, errorHandler } = require('../account');
const { verifyJwt } = require('@5qtrs/jwt');
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
      return res.status(403).json({ status: 403, statusCode: 403, message: 'Unauthorized' });
    }

    if (options.logs) {
      let logs;
      try {
        logs = await verifyJwt(token, process.env.LOGS_TOKEN_SIGNATURE_KEY);
      } catch (e) {
        // do nothing
      }
      if (!logs || !logs.subscriptionId || !logs.boundaryId || !logs.functionId) {
        return res.status(403).json({ status: 403, statusCode: 403, message: 'Unauthorized' });
      }
      req.logs = logs;
      return next();
    }

    if (options.resolve) {
      req.token = token;
      if (req.body && req.body.accessToken) {
        if (req.body.protocol === 'oauth') {
          try {
            req.body.decodedAccessToken = await validateAccessToken(req.params.accountId, req.body.accessToken);
            if (!req.body.decodedAccessToken) throw new Error('Unauthorized');
          } catch (_) {
            return res.status(403).json({ status: 403, statusCode: 403, message: 'Unauthorized' });
          }
        } else if (req.body.protocol === 'pki' && req.body.publicKey) {
          try {
            req.body.decodedAccessToken = await validateAccessTokenSignature(req.body.accessToken, req.body.publicKey);
            if (!req.body.decodedAccessToken) throw new Error('Unauthorized');
          } catch (_) {
            return res.status(403).json({ status: 403, statusCode: 403, message: 'Unauthorized' });
          }
        } else {
          return res.status(400).json({ status: 400, statusCode: 400, message: 'Invalid request' });
        }
      }
      return next();
    }

    const accountId = req.params.accountId;

    try {
      console.log(`authorize getResolvedAgent(${accountId})`);
      const resolvedAgent = await getResolvedAgent(accountId, token);

      console.log(`authorize resolvedAgent ${resolvedAgent.identity}`);
      req.resolvedAgent = resolvedAgent;
      if (options && options.operation) {
        const resource = req.path;
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
      next();
    } catch (error) {
      console.log(`authorize failed ${error}`);
      errorHandler(res)(error);
    }
  };
};
