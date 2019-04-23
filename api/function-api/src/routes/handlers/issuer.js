const { getAccountContext, errorHandler } = require('../account');

function issuerPost() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const issuerId = req.params.issuerId;
      const newIssuer = req.body;
      newIssuer.id = issuerId;

      accountContext.issuer
        .add(resolvedAgent, accountId, newIssuer)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function issuerPut() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const issuerId = req.params.issuerId;
      const updateIssuer = req.body;
      updateIssuer.id = issuerId;

      accountContext.issuer
        .update(resolvedAgent, accountId, updateIssuer)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function issuerGet() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const issuerId = req.params.issuerId;

      accountContext.issuer
        .get(resolvedAgent, accountId, issuerId)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function issuerList() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const limit = req.query.count;
      const next = req.query.next;
      const displayNameContains = req.query.name;
      const options = { limit, next, displayNameContains };

      accountContext.issuer
        .list(resolvedAgent, accountId, options)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function issuerDelete() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
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
  issuerPut,
  issuerGet,
  issuerList,
  issuerDelete,
};
