const { getAccountContext, errorHandler } = require('../account');

function initResolve() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const accountId = req.params.accountId;
      const initResolve = req.body;

      accountContext.init
        .resolve(accountId, initResolve)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

module.exports = {
  initResolve,
};
