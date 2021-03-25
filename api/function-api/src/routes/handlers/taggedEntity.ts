import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

const getTag = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const getAllTags = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const deleteTag = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const setTag = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

export { getTag, getAllTags, deleteTag, setTag };
