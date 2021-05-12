import { Request, Response, NextFunction } from 'express';

import { getStorageContext, errorHandler } from '../storage';
import create_error from 'http-errors';

import RDS from '@5qtrs/db';

const storageDb = RDS.DAO.Storage;

function normalize(e: any) {
  return { ...e.data, etag: `${e.version}` };
}

function etagToVersion(etag?: string) {
  // Convert the etag into a version specification
  let version;
  if (etag) {
    version = Number(etag.replace('W/', ''));
    if (Number.isNaN(version)) {
      throw new Error('invalid etag');
    }
  }
  return version;
}

const makeRequest = (req: Request, version?: number) => ({
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

    if (result && result.etag) {
      res.set('Etag', `W/"${result.etag}"`);
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
          next: req.query.next as string,
        },
        {
          listLimit: Number(req.query.count),
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
      try {
        version = etagToVersion(etag);
      } catch (err) {
        return next(create_error(400, err.message));
      }
    }

    try {
      result = normalize(await storageDb.createEntity({ ...makeRequest(req, version), data: storage }));
    } catch (err) {
      return next(err);
    }

    if (!passthrough) {
      if (result && result.etag) {
        res.set('Etag', `W/"${result.etag}"`);
      }
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
      try {
        version = etagToVersion(etag);
      } catch (err) {
        return next(create_error(400, err.message));
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
      result = await storageDb.deleteEntity(params);
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

    if (!passthrough) {
      res.status(result || req.params.recursive ? 204 : 404).end();
    }
  };
}

export { storageList, storageGet, storagePut, storageDelete };
