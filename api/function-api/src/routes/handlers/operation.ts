import create_error from 'http-errors';
import { v4 as uuidv4 } from 'uuid';

import { Request, Response, NextFunction } from 'express';

import RDS, { Model } from '@5qtrs/db';

/*
 * XXX Why is this a separate file than the other services?
 */

// Create an async operation with the initial status represented by the JSON payload of the request.
const post = async (req: Request, res: Response, next: NextFunction) => {
  const operationId = uuidv4();
  try {
    await RDS.DAO.operation.createEntity({
      accountId: req.params.accountId,
      subscriptionId: req.params.subscriptionId,
      id: operationId,
      data: req.body,
    });
    return res.json({ operationId });
  } catch (error) {
    return next(error);
  }
};

// Gets the most recent status of the async operation
const get = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operation = await RDS.DAO.operation.getEntity({
      accountId: req.params.accountId,
      subscriptionId: req.params.subscriptionId,
      id: req.params.operationId,
    });
    return res.status(operation.data.code).json({ ...operation.data, operationId: req.params.operationId });
  } catch (error) {
    return next(error);
  }
};

// Update the status of an async operation with the JSON payload of the request.
const put = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operation = await RDS.DAO.operation.updateEntity({
      accountId: req.params.accountId,
      subscriptionId: req.params.subscriptionId,
      id: req.params.operationId,
      data: req.body,
    });
    return res.json(operation.data);
  } catch (error) {
    return next(error);
  }
};

export { get, post, put };
