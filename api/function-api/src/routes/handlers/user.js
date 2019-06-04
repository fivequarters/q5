const { getAccountContext, getBaseUrl, errorHandler } = require('../account');
const create_error = require('http-errors');

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

function userPatch() {
  return (req, res, next) => {
    getAccountContext().then(accountContext => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const userId = req.params.userId;
      const updateUser = req.body;
      if (updateUser.id && updateUser.id !== userId) {
        const message = [
          `The userId in the body '${updateUser.id}'`,
          `does not match the userId in the URL '${userId}'`,
        ].join(' ');
        return next(new create_error(400, message));
      } else {
        updateUser.id = userId;
      }

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
      const issuerId = req.query.issuerId;
      const subject = req.query.subject;
      const include = req.query.include;
      const options = {
        limit,
        next,
        include,
        nameContains,
        primaryEmailContains,
        issuerId,
        subject,
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
      initEntry.baseUrl = getBaseUrl(req);
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
  userPatch,
  userGet,
  userList,
  userDelete,
  userInit,
};
