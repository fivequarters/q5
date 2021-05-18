import { Request, Response, NextFunction } from 'express';

import { getStorageContext, errorHandler } from '../storage';
import create_error from 'http-errors';

import RDS from '@5qtrs/db';

const storageDb = RDS.DAO.Storage;

function normalize(e: any) {
  return { data: e.data, etag: `${e.version}` };
}

const makeRequest = (req: Request, version?: string) => ({
  accountId: req.params.accountId,
  subscriptionId: req.params.subscriptionId,
  id: req.params.storageId,
  ...(version ? { version } : {}),
});

function storageGet() {
  return async (req: Request, res: Response, next: NextFunction) => {
    let result: any;

    try {
      result = normalize(await storageDb.getEntity(makeRequest(req)));
    } catch (err) {
      return next(err);
    }

    res.json(result);
  };
}

function storageList() {
  return async (req: Request, res: Response, next: NextFunction) => {
    let result: any;

    try {
      result = await storageDb.listEntities(
        {
          ...makeRequest(req),
          idPrefix: req.params.storageId,
        },
        {
          listLimit: Number(req.query.count),
          next: req.query.next as string,
        }
      );
      result.items = result.items.map((e: any) => ({ storageId: e.id })) as any;
    } catch (err) {
      return next(err);
    }

    res.json(result);
  };
}

function storagePut() {
  return async (req: Request, res: Response, next: NextFunction, passthrough: boolean = false) => {
    let result: any;
    const storage = req.body;
    let etag = req.header('If-Match');

    if (!storage.data) {
      return next(create_error(400, `No data was provided for '${req.params.storageId}'`));
    }

    if (storage.etag && etag && storage.etag !== etag) {
      const message = `The etag in the body '${storage.etag}' does not match the etag in the If-Match header '${etag}'`;
      return next(create_error(400, message));
    } else if (storage.etag) {
      etag = storage.etag;
    }

    delete storage.etag;

    // Convert the etag into a version specification
    let version;
    if (!passthrough) {
      version = etag;
    }

    try {
      result = normalize(await storageDb.createEntity({ ...makeRequest(req, version), data: storage.data }));
    } catch (err) {
      return next(err);
    }

    if (!passthrough) {
      res.json(result);
    }
  };
}

function storageDelete() {
  return async (req: Request, res: Response, next: NextFunction, passthrough: boolean = false) => {
    let result: any;

    const etag = req.header('If-Match');

    // Convert the etag into a version specification
    let version;
    if (!passthrough) {
      // Passthrough ignores all versioning; by this point Dynamo has already succeeded.
      version = etag;
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
      result = await storageDb.deleteEntity(params);
    } catch (err) {
      if (err.status === 404 && req.params.recursive) {
        // Treat recursive 404's as 204's.
        if (!passthrough) {
          return res.status(204).end();
        }
      }
      if (passthrough) {
        throw err;
      }
      return next(err);
    }

    if (!passthrough) {
      res.status(result || req.params.recursive ? 204 : 404).end();
    }
  };
}

export { storageList, storageGet, storagePut, storageDelete };
