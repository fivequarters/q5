import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

const post = (req: Request, res: Response, next: NextFunction) => {
  // Create new identity, likely from a session id.
  // Return async operation url for status
  next(create_error(418));
};

export { post };
