const { getAccountContext, errorHandler } = require('../account');
const { AwsRegistry } = require('@5qtrs/registry');
const { REGISTRY_DEFAULT, isGrafanaEnabled } = require('@5qtrs/constants');

const { initializeGrafana, getDefaultDashboards } = require('../grafana/initialize');

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
      // Create the account in Fusebit
      const account = await accountContext.account.add(resolvedAgent, newAccount);
      const awsRegistry = AwsRegistry.create({
        accountId: account.id,
        registryId: REGISTRY_DEFAULT,
      });
      await awsRegistry.refreshGlobal();

      if (isGrafanaEnabled()) {
        // Initialize Grafana
        const lastAction = { action: 'unknown' };
        try {
          await initializeGrafana(account.id, getDefaultDashboards(req), lastAction);
        } catch (err) {
          console.log(`GRAFANA ERROR: ${lastAction.action} failed: `, err.response?.error, err);
          // Silently eat an error here so that account creation doesn't fail due to Grafana.
        }
      }

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
