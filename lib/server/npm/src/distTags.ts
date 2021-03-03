import { Response, Request, NextFunction } from 'express';
import create_error from 'http-errors';

const distTagsGet = () => {
  return (reqGeneral: Request, res: Response, next: NextFunction) => {
    return next(create_error(501, 'distTagsGet unsupported'));
  };
};
const distTagsPut = () => {
  return (reqGeneral: Request, res: Response, next: NextFunction) => {
    return next(create_error(501, 'distTagsPut unsupported'));
  };
};

const distTagsDelete = () => {
  return (reqGeneral: Request, res: Response, next: NextFunction) => {
    return next(create_error(501, 'distTagsDelete unsupported'));
  };
};

export { distTagsGet, distTagsPut, distTagsDelete };
