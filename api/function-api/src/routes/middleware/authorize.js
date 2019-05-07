const { getResolvedAgent, errorHandler } = require('../account');
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
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const accountId = req.params.accountId;

    try {
      const resolvedAgent = await getResolvedAgent(accountId, token);

      req.resolvedAgent = resolvedAgent;
      if (options && options.operation) {
        const resource = req.path;
        const action = options.operation;
        const { iss, sub } = resolvedAgent.identities[0];
        await resolvedAgent.ensureAuthorized(action, resource);
        if (meteringEnabled) {
          meterApiCall({
            deploymentId: process.env.DEPLOYMENT_KEY,
            accountId,
            issuer: iss,
            subject: sub,
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
      errorHandler(res)(error);
    }
  };
};
