import { Response } from 'express';
import { IFunctionApiRequest } from './request';

const searchGet = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    const count = req.query.count ? Number(req.query.count) : 100;
    const next = req.query.next ? (req.query.next as string) : undefined;
    const results = await req.registry.search(req.query.text as string, count, next);

    return res.status(200).json(results);
  };
};

export { searchGet };
