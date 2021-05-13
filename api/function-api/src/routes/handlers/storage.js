const { getStorageContext, errorHandler } = require('../storage');
const create_error = require('http-errors');

const RDS = require('./storageRds');

function storageGet() {
  return (req, res) => {
    getStorageContext().then((storageContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const subscriptionId = req.params.subscriptionId;
      const storageId = req.params.storageId;

      storageContext.storage
        .get(resolvedAgent, accountId, subscriptionId, storageId)
        .then((result) => {
          if (result && result.etag) {
            res.set('Etag', `W/"${result.etag}"`);
          }
          res.json(result);
        })
        .catch(errorHandler(res));
    });
  };
}

function storageList() {
  return (req, res) => {
    getStorageContext().then((storageContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const subscriptionId = req.params.subscriptionId;
      const storageId = req.params.storageId;
      const limit = req.query.count;
      const next = req.query.next;
      const options = { limit, next };

      storageContext.storage
        .list(resolvedAgent, accountId, subscriptionId, storageId, options)
        .then((result) => res.json(result))
        .catch(errorHandler(res));
    });
  };
}

function storagePut() {
  return (req, res, next) => {
    getStorageContext().then((storageContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const subscriptionId = req.params.subscriptionId;
      const storageId = req.params.storageId;
      const storage = req.body;
      const etag = req.header('If-Match');
      if (storage.etag && etag && storage.etag !== etag) {
        const message = [
          `The etag in the body '${storage.etag}'`,
          `does not match the etag in the If-Match header '${etag}'`,
        ].join(' ');
        return next(new create_error(400, message));
      } else {
        storage.etag = etag || storage.etag;
      }

      storageContext.storage
        .set(resolvedAgent, accountId, subscriptionId, storageId, storage)
        .then((result) => {
          RDS.storagePut()(req, res, next, true).then(() => {
            if (result && result.etag) {
              res.set('Etag', `W/"${result.etag}"`);
            }
            res.json(result);
          });
        })
        .catch(errorHandler(res));
    });
  };
}

function storageDelete() {
  return (req, res, next) => {
    getStorageContext().then((storageContext) => {
      const resolvedAgent = req.resolvedAgent;
      const accountId = req.params.accountId;
      const subscriptionId = req.params.subscriptionId;
      const storageId = req.params.storageId;
      const recursive = req.params.recursive;
      const etag = req.header('If-Match');

      storageContext.storage
        .delete(resolvedAgent, accountId, subscriptionId, storageId, recursive, etag)
        .then(() => {
          RDS.storageDelete()(req, res, next, true)
            .then(() => {
              res.status(204);
              res.end();
            })
            .catch((err) => {
              // Record database errors; generally these will be operational not logical in nature.
              console.log(`DELETE ERROR: ${err}`);
            });
        })
        .catch(errorHandler(res));
    });
  };
}

module.exports = {
  storageList,
  storageGet,
  storagePut,
  storageDelete,
};
