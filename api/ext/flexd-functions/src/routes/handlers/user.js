const { getAccountContext, errorHandler } = require('../account');

function userPost() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const newUser = req.body;

      accountContext.user
        .add(resolvedAgent, accountId, newUser)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function userPut() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const userId = req.params.userId;
      const updateUser = req.body;
      updateUser.id = userId;

      accountContext.user
        .update(resolvedAgent, accountId, updateUser)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function userGet() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const userId = req.params.userId;

      accountContext.user
        .get(resolvedAgent, accountId, userId)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function userList() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const limit = req.query.count;
      const next = req.query.next;
      const nameContains = req.query.name;
      const primaryEmailContains = req.query.email;
      const issuerContains = req.query.iss;
      const subjectContains = req.query.sub;
      const include = req.query.include;
      const options = {
        limit,
        next,
        include,
        nameContains,
        primaryEmailContains,
        issuerContains,
        subjectContains,
      };

      accountContext.user
        .list(resolvedAgent, accountId, options)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function userDelete() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const userId = req.params.userId;

      accountContext.user
        .delete(resolvedAgent, accountId, userId)
        .then(() => {
          res.status(204);
          res.end();
        })
        .catch(errorHandler(res));
    });
  };
}

function userInit() {
  return (req, res) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const initEntry = req.body;
      initEntry.baseUrl = process.env.API_SERVER;
      initEntry.accountId = req.params.accountId;
      initEntry.agentId = req.params.userId;

      accountContext.user
        .init(resolvedAgent, initEntry)
        .then(result => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

module.exports = {
  userPost,
  userPut,
  userGet,
  userList,
  userDelete,
  userInit,
};
