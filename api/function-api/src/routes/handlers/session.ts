import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

const post = (req: Request, res: Response, next: NextFunction) => {
  // Create the session in DynamoDB and return the generated ID
  next(create_error(418));
};

const get = (req: Request, res: Response, next: NextFunction) => {
  // Return the top level "status" object of the contents of the session in DynamoDB, but none of the other
  // values.
  next(create_error(418));
};

const getAll = (req: Request, res: Response, next: NextFunction) => {
  // Return the entire contents of the session object in DynamoDB.
  next(create_error(418));
};

export { get, getAll, post };
