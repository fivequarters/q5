const { getAccountContext, getBaseUrl, errorHandler } = require('../account');
const create_error = require('http-errors');

function clientPost() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const newClient = req.body;

      accountContext.client
        .add(resolvedAgent, accountId, newClient)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function clientPatch() {
  return (req, res, next) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const clientId = req.params.clientId;
      const updateClient = req.body;
      if (updateClient.id && updateClient.id !== clientId) {
        const message = [
          `The clientId in the body '${updateClient.id}'`,
          `does not match the clientId in the URL '${clientId}'`,
        ].join(' ');
        return next(new create_error(400, message));
      } else {
        updateClient.id = clientId;
      }

      accountContext.client
        .update(resolvedAgent, accountId, updateClient)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function clientGet() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const clientId = req.params.clientId;

      accountContext.client
        .get(resolvedAgent, accountId, clientId)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function clientList() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const limit = req.query.count;
      const next = req.query.next;
      const displayNameContains = req.query.name;
      const issuerId = req.query.issuerId;
      const subject = req.query.subject;
      const include = req.query.include;
      const options = {
        limit,
        next,
        include,
        displayNameContains,
        issuerId,
        subject,
      };

      accountContext.client
        .list(resolvedAgent, accountId, options)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function clientDelete() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const clientId = req.params.clientId;

      accountContext.client
        .delete(resolvedAgent, accountId, clientId)
        .then(() => {
          res.status(204);
          res.end();
        })
        .catch(errorHandler(res));
    });
  };
}

function clientInit() {
  return (req, res, next) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const initEntry = req.body;
      initEntry.agentId = req.params.clientId;
      if (initEntry.protocol === 'pki' || initEntry.protocol === 'oauth') {
        // current format
        initEntry.profile = initEntry.profile || {};
        initEntry.profile.baseUrl = getBaseUrl(req);
        initEntry.profile.account = req.params.accountId;
      } else {
        // legacy PKI format
        initEntry.baseUrl = getBaseUrl(req);
        initEntry.accountId = req.params.accountId;
      }

      accountContext.client
        .init(resolvedAgent, initEntry)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

module.exports = {
  clientPost,
  clientPatch,
  clientGet,
  clientList,
  clientDelete,
  clientInit,
};
