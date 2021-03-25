import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

const get = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const getAll = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const post = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const put = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const remove = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

const instanceGet = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const instanceGetAll = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const instancePost = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const instancePut = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const instancePatch = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const instanceRemove = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const instance = {
  get: instanceGet,
  getAll: instanceGetAll,
  post: instancePost,
  put: instancePut,
  patch: instancePatch,
  remove: instanceRemove,
};

export { get, getAll, post, remove, put, instance };
