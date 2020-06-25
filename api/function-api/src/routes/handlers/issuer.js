const { getAccountContext, errorHandler } = require('../account');
const create_error = require('http-errors');

function issuerPost() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const issuerId = req.params.issuerId;
      const newIssuer = req.body;
      newIssuer.id = issuerId;

      accountContext.issuer
        .add(resolvedAgent, accountId, newIssuer)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function issuerPatch() {
  return (req, res, next) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const issuerId = req.params.issuerId;
      const updateIssuer = req.body;
      if (updateIssuer.id && updateIssuer.id !== issuerId) {
        const message = [
          `The issuerId in the body '${updateIssuer.id}'`,
          `does not match the issuerId in the URL '${issuerId}'`,
        ].join(' ');
        return next(new create_error(400, message));
      } else {
        updateIssuer.id = issuerId;
      }

      accountContext.issuer
        .update(resolvedAgent, accountId, updateIssuer)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function issuerGet() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const issuerId = req.params.issuerId;

      accountContext.issuer
        .get(resolvedAgent, accountId, issuerId)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function issuerList() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const limit = req.query.count;
      const next = req.query.next;
      const displayNameContains = req.query.name;
      const options = { limit, next, displayNameContains };

      accountContext.issuer
        .list(resolvedAgent, accountId, options)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function issuerDelete() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const issuerId = req.params.issuerId;

      accountContext.issuer
        .delete(resolvedAgent, accountId, issuerId)
        .then(() => {
          res.status(204);
          res.end();
        })
        .catch(errorHandler(res));
    });
  };
}

module.exports = {
  issuerPost,
  issuerPatch,
  issuerGet,
  issuerList,
  issuerDelete,
};
