const create_error = require('http-errors');
const { IdType, Id } = require('@5qtrs/account-data');
const { getAccountContext, errorHandler } = require('../account');

function initResolve() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const accountId = req.params.accountId;
      let initResolve;
      switch (req.body.protocol) {
        case 'oauth':
          initResolve = {
            protocol: 'oauth',
            initToken: req.token,
            accessToken: req.body.accessToken,
            decodedAccessToken: req.body.decodedAccessToken,
          };
          break;
        case 'pki':
          initResolve = {
            protocol: 'pki',
            initToken: req.token,
            accessToken: req.body.accessToken,
            decodedAccessToken: req.body.decodedAccessToken,
            publicKey: req.body.publicKey,
          };
          break;
        default:
          // legacy PKI format
          initResolve = {
            initToken: req.token,
            publicKey: req.body.publicKey,
            keyId: req.body.keyId,
          };
      }

      accountContext.init
        .resolve(accountId, initResolve)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function getMe() {
  return (req, res, next) => {
    getAccountContext().then((accountContext) => {
      const accountId = req.params.accountId;
      const resolvedAgent = req.resolvedAgent;

      let action;
      let resource;
      let agent;
      const agentId = resolvedAgent.id;
      const idType = Id.getIdType(agentId);
      if (idType === IdType.user) {
        agent = accountContext.user;
        action = 'user:get';
        resource = `/account/${accountId}/user/${agentId}/`;
      } else if (idType === IdType.client) {
        agent = accountContext.client;
        action = 'client:get';
        resource = `/account/${accountId}/client/${agentId}/`;
      }

      if (!agent) {
        return next(new create_error(400, 'Invalid agent id'));
      }

      resolvedAgent
        .addAuditEntry(action, resource, true)
        .then(() => {
          agent
            .get(resolvedAgent, accountId, resolvedAgent.id)
            .then((result) => res.json(result))
            .catch(errorHandler(res));
        })
        .catch(errorHandler(res));
    });
  };
}

module.exports = {
  initResolve,
  getMe,
};
