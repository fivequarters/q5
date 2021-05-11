import { Request, Response, NextFunction } from 'express';

import { getStorageContext, errorHandler } from '../storage';
import create_error from 'http-errors';

import RDS from '@5qtrs/db';

const storageDb = RDS.DAO.Storage;

type IExtendedRequest = Request & { resolvedAgent: any };

function compare(lhs: any, rhs: any) {
  return JSON.stringify(lhs) !== JSON.stringify(rhs);
}

const makeRequest = (req: IExtendedRequest, version?: string) => ({
  accountId: req.params.accountId,
  subscriptionId: req.params.subscriptionId,
  id: req.params.storageId,
  ...(version ? { version: parseInt(version, 10) } : {}),
});

function storageGet() {
  return async (req: IExtendedRequest, res: Response) => {
    let result: any;
    let resultDb: any;
    try {
      [result, resultDb] = await Promise.all([
        (async () => {
          return (await getStorageContext()).storage.get(
            req.resolvedAgent,
            req.params.accountId,
            req.params.subscriptionId,
            req.params.storageId
          );
        })(),
        storageDb.getEntity(makeRequest(req)),
      ]);
    } catch (err) {
      return errorHandler(res)(err);
    }

    if (compare(result, resultDb)) {
      console.log(`ERROR: Inconsistent storage: ${req.params.storageId}`);
    }
    if (result && result.etag) {
      res.set('Etag', `W/"${result.etag}"`);
    }
    res.json(result);
  };
}

function storageList() {
  return async (req: IExtendedRequest, res: Response) => {
    let result: any;
    let resultDb: any;
    const options = {
      limit: req.query.count,
      next: req.query.next,
    };
    try {
      [result, resultDb] = await Promise.all([
        (async () => {
          return (await getStorageContext()).storage.list(
            req.resolvedAgent,
            req.params.accountId,
            req.params.subscriptionId,
            req.params.storageId,
            options
          );
        })(),
        storageDb.listEntities(makeRequest(req)),
      ]);
    } catch (err) {
      return errorHandler(res)(err);
    }

    if (compare(result, resultDb)) {
      console.log(`ERROR: Inconsistent storage: ${req.params.storageId}`);
    }

    res.json(result);
  };
}

function storagePut() {
  return async (req: IExtendedRequest, res: Response, next: NextFunction) => {
    let result: any;
    let resultDb: any;
    const storage = req.body;
    const etag = req.header('If-Match');

    if (storage.etag && etag && storage.etag !== etag) {
      const message = `The etag in the body '${storage.etag}' does not match the etag in the If-Match header '${etag}'`;
      return next(create_error(400, message));
    } else {
      delete storage.etag;
    }

    const version = etag ? etag.replace('W/', '') : undefined;

    try {
      [result, resultDb] = await Promise.all([
        (async () => {
          return (await getStorageContext()).storage.set(
            req.resolvedAgent,
            req.params.accountId,
            req.params.subscriptionId,
            req.params.storageId,
            storage
          );
        })(),
        storageDb.createEntity({ ...makeRequest(req, version), data: storage }),
      ]);
    } catch (err) {
      return errorHandler(res)(err);
    }

    console.log(`${JSON.stringify(result)} == ${JSON.stringify(resultDb)}`);

    if (compare(result, resultDb)) {
      console.log(`ERROR: Inconsistent storage: ${req.params.storageId}`);
    }

    if (result && result.etag) {
      res.set('Etag', `W/"${result.etag}"`);
    }
    res.json(result);
  };
}

function storageDelete() {
  return async (req: IExtendedRequest, res: Response) => {
    let result: any;
    let resultDb: any;
    try {
      [result, resultDb] = await Promise.all([
        (async () => {
          return (await getStorageContext()).storage.delete(
            req.resolvedAgent,
            req.params.accountId,
            req.params.subscriptionId,
            req.params.storageId,
            req.params.recursive,
            req.header('If-Match')
          );
        })(),
        storageDb.deleteEntity(makeRequest(req)),
      ]);
    } catch (err) {
      return errorHandler(res)(err);
    }

    if (compare(result, resultDb)) {
      console.log(`ERROR: Inconsistent storage: ${req.params.storageId}`);
    }
    res.status(204).end();
  };
}

export { storageList, storageGet, storagePut, storageDelete };
