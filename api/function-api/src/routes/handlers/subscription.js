const { getAccountContext, errorHandler } = require('../account');

function subscriptionPost() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const newSubscription = req.body;

      accountContext.subscription
        .add(resolvedAgent, accountId, newSubscription)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function subscriptionGet(subscriptionCache) {
  return async (req, res) => {
    if (req.query.include === 'cache') {
      try {
        const subscription = await subscriptionCache.get(req.params.accountId, req.params.subscriptionId);
        res.json(subscription);
      } catch (error) {
        errorHandler(res)(error);
      }
      return;
    }

    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const subscriptionId = req.params.subscriptionId;

      accountContext.subscription
        .get(resolvedAgent, accountId, subscriptionId)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function subscriptionList() {
  return (req, res) => {
    getAccountContext().then((accountContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const limit = req.query.count;
      const next = req.query.next;
      const options = { limit, next };

      accountContext.subscription
        .list(resolvedAgent, accountId, options)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

module.exports = {
  subscriptionPost,
  subscriptionGet,
  subscriptionList,
};
