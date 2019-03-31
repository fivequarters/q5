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
  clientPost,
  clientList,
  clientGet,
  clientPut,
  clientDelete,
};
