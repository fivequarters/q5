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
      const issuerId = req.query.issuerId;
      const subject = req.query.subject;
      const from = req.query.from;
      const to = req.query.to;
      const options = {
        limit,
        next,
        actionContains,
        resourceStartsWith,
        issuerId,
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
