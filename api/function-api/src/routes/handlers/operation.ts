import create_error from 'http-errors';

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
};

export { get, post, put };
