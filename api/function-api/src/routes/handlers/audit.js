const { getAccountContext, errorHandler } = require('../account');

function auditGet() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const limit = req.query.count;
      const next = req.query.next;
      const actionContains = req.query.action;
      const resourceStartsWith = req.query.resource;
      const issuer = req.query.iss;
      const subject = req.query.sub;
      const from = req.query.from;
      const to = req.query.to;
      const options = {
        limit,
        next,
        actionContains,
        resourceStartsWith,
        issuer,
        subject,
        from,
        to,
      };

      accountContext.audit
        .list(resolvedAgent, accountId, options)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

module.exports = {
  auditGet,
};
