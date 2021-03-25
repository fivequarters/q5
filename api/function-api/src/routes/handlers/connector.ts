import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

const post = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

export { post };
