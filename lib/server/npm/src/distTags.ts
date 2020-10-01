import { Response } from 'express';
import { IFunctionApiRequest } from './request';

const distTagsGet = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    return res.status(501).json({ status: 501, statusCode: 501, message: 'distTagsGet' });
  };
};
const distTagsPut = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    return res.status(501).json({ status: 501, statusCode: 501, message: 'distTagsPut' });
  };
};

const distTagsDelete = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    return res.status(501).json({ status: 501, statusCode: 501, message: 'distTagsDelete' });
  };
};

export { distTagsGet, distTagsPut, distTagsDelete };
