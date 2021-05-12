import { Request, Response, NextFunction } from 'express';

import { getStorageContext, errorHandler } from '../storage';
import create_error from 'http-errors';

import RDS from '@5qtrs/db';

const storageDb = RDS.DAO.Storage;

type IExtendedRequest = Request & { resolvedAgent: any };

function normalize(e: any) {
  return { ...e.data, etag: `${e.version}` };
}

const makeRequest = (req: IExtendedRequest, version?: number) => ({
  accountId: req.params.accountId,
  subscriptionId: req.params.subscriptionId,
  id: req.params.storageId,
  ...(version ? { version } : {}),
});

function storageGet() {
  return async (req: IExtendedRequest, res: Response, next: NextFunction) => {
    let result: any;
    let resultDb: any;
    try {
      [result, resultDb] = await Promise.all([
        (async () => {
          /*
          return (await getStorageContext()).storage.get(
            req.resolvedAgent,
            req.params.accountId,
            req.params.subscriptionId,
            req.params.storageId
          );
        */
        })(),
        (async () => normalize(await storageDb.getEntity(makeRequest(req))))(),
      ]);
    } catch (err) {
      return next(err);
    }

    result = resultDb;

    if (result && result.etag) {
      res.set('Etag', `W/"${result.etag}"`);
    }
    res.json(result);
  };
}

function storageList() {
  return async (req: IExtendedRequest, res: Response, next: NextFunction) => {
    let result: any;
    let resultDb: any;
    const options = {
      limit: req.query.count,
      next: req.query.next,
    };

    try {
      [result, resultDb] = await Promise.all([
        (async () => {
          /*
          return (await getStorageContext()).storage.list(
            req.resolvedAgent,
            req.params.accountId,
            req.params.subscriptionId,
            req.params.storageId,
            options
          );
         */
        })(),
        (async () => {
          const list = await storageDb.listEntities(
            {
              ...makeRequest(req),
              idPrefix: req.params.storageId,
              next: req.query.next as string,
            },
            {
              listLimit: Number(req.query.count),
            }
          );
          list.items = list.items.map((e) => ({ storageId: e.id })) as any;
          return list;
        })(),
      ]);
    } catch (err) {
      return next(err);
    }

    result = resultDb;

    res.json(result);
  };
}

function storagePut() {
  return async (req: IExtendedRequest, res: Response, next: NextFunction) => {
    let result: any;
    let resultDb: any;
    const storage = req.body;
    let etag = req.header('If-Match');

    if (!req.body.data) {
      return next(create_error(400, `No data was provided for '${req.params.storageId}'`));
    }

    if (storage.etag && etag && storage.etag !== etag) {
      const message = `The etag in the body '${storage.etag}' does not match the etag in the If-Match header '${etag}'`;
      return next(create_error(400, message));
    } else if (storage.etag) {
      etag = storage.etag;
    }

    delete storage.etag;

    let version;
    if (etag) {
      version = Number(etag.replace('W/', ''));
      if (Number.isNaN(version)) {
        return next(create_error(400, 'invalid etag'));
      }
    }

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
        (async () => normalize(await storageDb.createEntity({ ...makeRequest(req, version), data: storage })))(),
      ]);
    } catch (err) {
      return next(err);
    }

    result = resultDb;

    if (result && result.etag) {
      res.set('Etag', `W/"${result.etag}"`);
    }
    res.json(result);
  };
}

function storageDelete() {
  return async (req: IExtendedRequest, res: Response, next: NextFunction) => {
    let result: any;
    let resultDb: any;

    console.log(`storageDelete: `, req.params);

    const etag = req.header('If-Match');
    let version;

    if (etag) {
      version = Number(etag.replace('W/', ''));
      if (Number.isNaN(version)) {
        return next(create_error(400, 'invalid etag'));
      }
    }

    const params: any = {
      accountId: req.params.accountId,
      subscriptionId: req.params.subscriptionId,
      ...(version ? { version } : {}),
    };

    if (req.params.recursive) {
      params.idPrefix = req.params.storageId;
    } else {
      params.id = req.params.storageId;
    }

    try {
      [result, resultDb] = await Promise.all([
        (async () => {
          /*
          return (await getStorageContext()).storage.delete(
            req.resolvedAgent,
            req.params.accountId,
            req.params.subscriptionId,
            req.params.storageId,
            req.params.recursive,
            req.header('If-Match')
          );
        */
        })(),
        storageDb.deleteEntity(params),
      ]);
    } catch (err) {
      // Exceptions only get generated when versioning is involved, otherwise it updates with a 0 record
      // changed result and returns false.
      if (err.message.indexOf('conflict') !== -1) {
        return next(create_error(409, 'Version mismatch'));
      }
      if (err.message.indexOf('not_found') !== -1) {
        return next(create_error(409));
      }
      return next(err);
    }

    res.status(resultDb || req.params.recursive ? 204 : 404).end();
  };
}

export { storageList, storageGet, storagePut, storageDelete };
