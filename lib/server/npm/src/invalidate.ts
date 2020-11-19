import { Response } from 'express';
import { IFunctionApiRequest } from './request';

import create_error from 'http-errors';

const invalidatePost = () => {
  return (req: IFunctionApiRequest, res: Response, next: any) => {
    return next(create_error(501, 'invalidatePost unsupported'));
  };
};

export { invalidatePost };
