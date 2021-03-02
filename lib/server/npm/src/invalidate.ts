import { Response, Request } from 'express';
import { IFunctionApiRequest } from './request';

import create_error from 'http-errors';

const invalidatePost = () => {
  return (reqGeneral: Request, res: Response, next: any) => {
    const req = reqGeneral as IFunctionApiRequest;
    return next(create_error(501, 'invalidatePost unsupported'));
  };
};

export { invalidatePost };
