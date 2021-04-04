import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

// Get the health of the current object
const get = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

export { get };
