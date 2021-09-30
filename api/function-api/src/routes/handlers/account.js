const { getAccountContext, errorHandler } = require('../account');
const { AwsRegistry } = require('@5qtrs/registry');
const { REGISTRY_DEFAULT } = require('@5qtrs/constants');

function accountPatch() {
  return async (req, res) => {
    const accountContext = await getAccountContext();
    const resolvedAgent = req.resolvedAgent;
    const accountId = req.params.accountId;
    const currentAccount = await accountContext.account.get(resolvedAgent, accountId);

    const patchedAccount = {
      ...currentAccount,
      ...req.body,
    };

    try {
      const account = await accountContext.account.update(resolvedAgent, patchedAccount);
      res.json(account);
    } catch (err) {
      const handleError = errorHandler(res);
      handleError(err);
    }
  };
}

function accountPost() {
  return async (req, res) => {
    const accountContext = await getAccountContext();
    const resolvedAgent = req.resolvedAgent;
    const newAccount = req.body;

    try {
      const account = await accountContext.account.add(resolvedAgent, newAccount);
      const awsRegistry = AwsRegistry.create({
        accountId: account.id,
        registryId: REGISTRY_DEFAULT,
      });
      await awsRegistry.refreshGlobal();
      res.json(account);
    } catch (err) {
      const handleError = errorHandler(res);
      handleError(err);
    }
  };
}

function accountGet() {
  return async (req, res) => {
    const accountContext = await getAccountContext();
    const resolvedAgent = req.resolvedAgent;
    const accountId = req.params.accountId;

    try {
      const result = await accountContext.account.get(resolvedAgent, accountId);
      res.json(result);
    } catch (err) {
      const handleError = errorHandler(res);
      handleError(err);
    }
  };
}

module.exports = {
  accountPatch,
  accountPost,
  accountGet,
};
