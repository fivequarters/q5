import { Response } from 'express';
import { IFunctionApiRequest } from './request';

const allPackagesGet = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    return res.status(501).json({ status: 501, statusCode: 501, message: 'allPackagesGet' });
  };
};

export { allPackagesGet };
