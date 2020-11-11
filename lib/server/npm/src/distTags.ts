import { Response } from 'express';
import create_error from 'http-errors';

import { IFunctionApiRequest } from './request';

const distTagsGet = () => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    return next(create_error(501, 'distTagsGet unsupported'));
  };
};
const distTagsPut = () => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    return next(create_error(501, 'distTagsPut unsupported'));
  };
};

const distTagsDelete = () => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    return next(create_error(501, 'distTagsDelete unsupported'));
  };
};

export { distTagsGet, distTagsPut, distTagsDelete };
