const { getAccountContext, errorHandler } = require('../account');

function accountPost() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const newAccount = req.body;

      accountContext.account
        .add(resolvedAgent, newAccount)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function accountGet() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;

      accountContext.account
        .get(resolvedAgent, accountId)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

module.exports = {
  accountPost,
  accountGet,
};
