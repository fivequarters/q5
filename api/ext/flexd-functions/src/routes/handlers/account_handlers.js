var { AccountDataAws } = require('@5qtrs/account-data-aws');
var { AwsCreds } = require('@5qtrs/aws-cred');
var { AwsDeployment } = require('@5qtrs/aws-deployment');

async function getDataAccess() {
  const creds = await AwsCreds.create({
    account: process.env.AWS_ACCOUNT,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    useMfa: false,
  });
  const deployment = await AwsDeployment.create({
    regionCode: process.env.AWS_REGION,
    account: process.env.AWS_ACCOUNT,
    key: process.env.DEPLOYMENT_KEY,
  });

  const dataAccess = await AccountDataAws.create({ creds, deployment });
  return dataAccess;
}

// Accounts

function accountPost() {
  return (req, res) => {
    getDataAccess().then(dataAccess => {
      dataAccess.addAccount(req.body).then(account => res.json(account));
    });
  };
}

function accountGet() {
  return (req, res) => {
    const accountId = req.params.accountId;
    getDataAccess().then(dataAccess => {
      dataAccess.getAccount(accountId).then(account => {
        if (!account) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(account);
      });
    });
  };
}

// Subscriptions

function subscriptionPost() {
  return (req, res) => {
    const accountId = req.params.accountId;
    getDataAccess().then(dataAccess => {
      dataAccess.addSubscription(accountId, req.body).then(subscription => {
        if (!subscription) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(subscription);
      });
    });
  };
}

function subscriptionGet() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const subscriptionId = req.params.subscriptionId;
    getDataAccess().then(dataAccess => {
      dataAccess.getSubscription(accountId, subscriptionId).then(subscription => {
        if (!subscription) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(subscription);
      });
    });
  };
}

function subscriptionList() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const limit = req.query.count;
    const next = req.query.next;
    getDataAccess().then(dataAccess => {
      const options = { limit, next };
      dataAccess.listSubscriptions(accountId, options).then(subscriptions => {
        if (!subscriptions) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(subscriptions);
      });
    });
  };
}

// Issuers

function issuerPut() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const issuerId = req.params.issuerId;
    getDataAccess().then(dataAccess => {
      const newIssuer = req.body;
      newIssuer.id = issuerId;
      dataAccess
        .addIssuer(accountId, newIssuer)
        .then(issuer => {
          if (!issuer) {
            return res.status(404).json({ message: 'Not Found' });
          }
          res.json(issuer);
        })
        .catch(error => {
          if (!error.code) {
            return res.status(400).json({ message: error.message });
          }
        });
    });
  };
}

function issuerGet() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const issuerId = req.params.issuerId;
    getDataAccess().then(dataAccess => {
      dataAccess.getIssuer(accountId, issuerId).then(issuer => {
        if (!issuer) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(issuer);
      });
    });
  };
}

function issuerList() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const limit = req.query.count;
    const next = req.query.next;
    getDataAccess().then(dataAccess => {
      const options = { limit, next };
      dataAccess.listIssuers(accountId, options).then(issuers => {
        if (!issuers) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(issuers);
      });
    });
  };
}

function issuerDelete() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const issuerId = req.params.issuerId;
    getDataAccess().then(dataAccess => {
      dataAccess.removeIssuer(accountId, issuerId).then(removed => {
        if (!removed) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.status(204);
        res.end();
      });
    });
  };
}

// Users

function userPost() {
  return (req, res) => {
    const accountId = req.params.accountId;

    getDataAccess().then(dataAccess => {
      const newUser = req.body;

      if (!req.isRoot) {
        const agentAccessEntries = req.accessEntries;
        if (newUser.access && newUser.access.allow && newUser.access.allow.length) {
          newUser.access.allow = newUser.access.allow.map(normalizeAccessEntry);
          for (const accessEntry of newUser.access.allow) {
            if (agentCanGiveAccess(agentAccessEntries, accessEntry)) {
              return res.status(403).end();
            }
          }
        }
      }

      dataAccess
        .addUser(accountId, newUser)
        .then(user => {
          if (!user) {
            return res.status(404).json({ message: 'Not Found' });
          }
          res.json(user);
        })
        .catch(error => {
          if (!error.code) {
            return res.status(400).json({ message: error.message });
          }
        });
    });
  };
}

function userPut() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const userId = req.params.userId;
    getDataAccess().then(dataAccess => {
      const userToUpdate = req.body;
      userToUpdate.id = userId;

      if (!req.isRoot) {
        const agentAccessEntries = req.accessEntries;
        if (userToUpdate.access && userToUpdate.access.allow && userToUpdate.access.allow.length) {
          userToUpdate.access.allow = userToUpdate.access.allow.map(normalizeAccessEntry);
          for (const accessEntry of userToUpdate.access.allow) {
            if (!agentCanGiveAccess(agentAccessEntries, accessEntry)) {
              return res.status(403).end();
            }
          }
        }
      }

      dataAccess
        .updateUser(accountId, userToUpdate)
        .then(user => {
          if (!user) {
            return res.status(404).json({ message: 'Not Found' });
          }
          res.json(user);
        })
        .catch(error => {
          if (!error.code) {
            return res.status(400).json({ message: error.message });
          }
        });
    });
  };
}

function userGet() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const userId = req.params.userId;
    getDataAccess().then(dataAccess => {
      dataAccess.getUser(accountId, userId).then(user => {
        if (!user) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(user);
      });
    });
  };
}

function userList() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const limit = req.query.count;
    const next = req.query.next;
    const full = req.query.include == 'all';
    getDataAccess().then(dataAccess => {
      const options = { limit, next, full };
      dataAccess.listUsers(accountId, options).then(users => {
        if (!users) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(users);
      });
    });
  };
}

function userDelete() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const userId = req.params.userId;
    getDataAccess().then(dataAccess => {
      dataAccess.removeUser(accountId, userId).then(removed => {
        if (!removed) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.status(204);
        res.end();
      });
    });
  };
}

function userInit() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const userId = req.params.userId;
    getDataAccess().then(dataAccess => {
      const initEntry = req.body;
      initEntry.baseUrl = process.env.API_SERVER;
      initEntry.accountId = accountId;
      initEntry.agentId = userId;
      dataAccess.initUser(initEntry).then(jwt => {
        if (!jwt) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(jwt);
      });
    });
  };
}

function userInitResolve() {
  return (req, res) => {
    getDataAccess().then(dataAccess => {
      const initResolve = req.body;
      dataAccess.initResolveUser(initResolve).then(user => {
        if (!user) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(user);
      });
    });
  };
}

// Clients

function clientPost() {
  return (req, res) => {
    const accountId = req.params.accountId;
    getDataAccess().then(dataAccess => {
      const newClient = req.body;
      dataAccess
        .addClient(accountId, newClient)
        .then(client => {
          if (!client) {
            return res.status(404).json({ message: 'Not Found' });
          }
          res.json(client);
        })
        .catch(error => {
          if (!error.code) {
            return res.status(400).json({ message: error.message });
          }
        });
    });
  };
}

function clientPut() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const clientId = req.params.clientId;
    getDataAccess().then(dataAccess => {
      const clientToUpdate = req.body;
      clientToUpdate.id = clientId;

      dataAccess
        .updateClient(accountId, clientToUpdate)
        .then(client => {
          if (!client) {
            return res.status(404).json({ message: 'Not Found' });
          }
          res.json(client);
        })
        .catch(error => {
          if (!error.code) {
            return res.status(400).json({ message: error.message });
          }
        });
    });
  };
}

function clientGet() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const clientId = req.params.clientId;
    getDataAccess().then(dataAccess => {
      dataAccess.getClient(accountId, clientId).then(client => {
        if (!client) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(client);
      });
    });
  };
}

function clientList() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const limit = req.query.count;
    const next = req.query.next;
    const full = req.query.include == 'all';
    getDataAccess().then(dataAccess => {
      const options = { limit, next, full };
      dataAccess.listClients(accountId, options).then(clients => {
        if (!clients) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.json(clients);
      });
    });
  };
}

function clientDelete() {
  return (req, res) => {
    const accountId = req.params.accountId;
    const clientId = req.params.clientId;
    getDataAccess().then(dataAccess => {
      dataAccess.removeClient(accountId, clientId).then(removed => {
        if (!removed) {
          return res.status(404).json({ message: 'Not Found' });
        }
        res.status(204);
        res.end();
      });
    });
  };
}

function normalizeAccessEntry(accessEntry) {
  accessEntry.resource = normalizeAuthResource(accessEntry.resource);
  return accessEntry;
}

function normalizeAuthResource(authResource) {
  if (authResource[0] !== '/') {
    authResource = `/${authResource}`;
  }
  if (authResource[authResource.length - 1] !== '/') {
    authResource = `${authResource}/`;
  }
  return authResource;
}

function doesResouceAuthorize(grantedResource, requestedResource) {
  return requestedResource.indexOf(grantedResource) === 0;
}

function doesActionAuthorize(grantedAction, requestedAction) {
  const grantedSegments = grantedAction.split(':');
  const requestedSegments = requestedAction.split(':');
  if (grantedAction === requestedAction) {
    return true;
  }
  for (let i = 0; i < requestedSegments.length; i++) {
    if (grantedSegments[i]) {
      if (grantedSegments[i] === '*') {
        return true;
      } else if (grantedSegments[i] === requestedSegments[i]) {
        // ok, continue to check the next segment
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  return false;
}

function agentCanGiveAccess(agentAccessEntries, accessEntry) {
  for (const agentAccessEntry of agentAccessEntries) {
    const actionAuth = doesActionAuthorize(agentAccessEntry.action, accessEntry.action);
    const resourceAuth = doesResouceAuthorize(agentAccessEntry.resource, accessEntry.resource);
    if (actionAuth && resourceAuth) {
      return true;
    }
  }
  return false;
}

module.exports = {
  accountGet,
  accountPost,
  subscriptionPost,
  subscriptionGet,
  subscriptionList,
  issuerPut,
  issuerGet,
  issuerList,
  issuerDelete,
  userPost,
  userList,
  userGet,
  userPut,
  userDelete,
  userInit,
  userInitResolve,
  clientPost,
  clientList,
  clientGet,
  clientPut,
  clientDelete,
};
