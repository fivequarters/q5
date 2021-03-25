import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

const get = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const getAll = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const post = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const put = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const remove = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

const sessionGet = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const sessionGetAll = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const sessionPost = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

const session = { get: sessionGet, post: sessionPost, getAll: sessionGetAll };

const identityGet = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const identityGetAll = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const identityPost = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const identityPatch = (req: Request, res: Response, next: NextFunction) => next(create_error(418));
const identityRemove = (req: Request, res: Response, next: NextFunction) => next(create_error(418));

const identity = {
  get: identityGet,
  post: identityPost,
  getAll: identityGetAll,
  patch: identityPatch,
  remove: identityRemove,
};

export { get, getAll, post, put, remove, session, identity };
