import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

// Create an async operation with the initial status represented by the JSON payload of the request.
const post = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Gets the most recent status of the async operation
const get = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

// Update the status of an async operation with the JSON payload of the request.
const put = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

export { get, post, put };
