import { Request, Response, NextFunction } from 'express';

import create_error from 'http-errors';

import RDS, { Model } from '@5qtrs/db';

const storageDb = RDS.DAO.storage;

interface IStorageResult {
  data?: string;
  etag: string;
  tags: any;
  expires?: string;
  storageId: string;
}

function normalize(e: Model.IEntity): IStorageResult {
  return { data: e.data, etag: `${e.version}`, tags: e.tags, expires: e.expires, storageId: e.id };
}

const makeRequest = (req: Request, version?: string) => ({
  accountId: req.params.accountId,
  subscriptionId: req.params.subscriptionId,
  id: req.params.storageId,
  ...(version ? { version } : {}),
});

function storageGet() {
  return async (req: Request, res: Response, next: NextFunction) => {
    let result: IStorageResult;

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
    let result: { items: Model.IEntity[] };
    let output: { items: IStorageResult[] };

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
      output = {
        ...result,
        items: result.items.map((e: Model.IEntity) => ({
          storageId: e.id,
          tags: e.tags,
          expires: e.expires,
          etag: e.version as string,
        })),
      };
    } catch (err) {
      return next(err);
    }

    res.json(output);
  };
}

function storagePut() {
  return async (req: Request, res: Response, next: NextFunction) => {
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

    try {
      result = normalize(
        await storageDb.createEntity({
          ...makeRequest(req, etag),
          data: storage.data,
          tags: storage.tags,
          expires: storage.expires,
        })
      );
    } catch (err) {
      return next(err);
    }
    res.json(result);
  };
}

function storageDelete() {
  return async (req: Request, res: Response, next: NextFunction) => {
    let result: any;

    const etag = req.header('If-Match');

    const params: any = {
      accountId: req.params.accountId,
      subscriptionId: req.params.subscriptionId,
      ...(etag ? { version: etag } : {}),
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
        return res.status(204).end();
      }
      return next(err);
    }

    res.status(result || req.params.recursive ? 204 : 404).end();
  };
}

export { storageList, storageGet, storagePut, storageDelete };
