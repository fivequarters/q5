import create_error from 'http-errors';
<<<<<<< HEAD

import { Request, Response, NextFunction } from 'express';

// Create an async operation with the initial status represented by the JSON payload of the request.
const post = (req: Request, res: Response, next: NextFunction) => {
  // Record the outstanding operation in DynamoDB with a specified TTL (either constant or parameterized).
  next(create_error(418));
};

// Gets the most recent status of the async operation
const get = (req: Request, res: Response, next: NextFunction) => {
  // Query DynamoDB for the latest result for the given operationId.
  next(create_error(418));
};

// Update the status of an async operation with the JSON payload of the request.
const put = (req: Request, res: Response, next: NextFunction) => {
  // Use UpdateItem with a check to make sure that the ttl has not expired (and is set).
  // Return an error if the specified item either doesn't exist or the ttl has expired.
  next(create_error(418));
=======
import { v4 as uuidv4 } from 'uuid';

import { Request, Response, NextFunction } from 'express';

import RDS, { Model } from '@5qtrs/db';

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
    return res.status(operation.data.code).json(operation.data);
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
>>>>>>> master
};

export { get, post, put };
