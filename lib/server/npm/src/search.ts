import { Response, Request } from 'express';
import { tarballUrlUpdate } from './package';
import { IFunctionApiRequest } from './interfaces';

const searchGet = () => {
  return async (reqGeneric: Request, res: Response, next: any) => {
    const req = reqGeneric as IFunctionApiRequest;
    const count = req.query.count ? Number(req.query.count) : 100;
    const searchNext = req.query.next ? (req.query.next as string) : undefined;
    try {
      const results = await req.registry.search(req.query.text as string, count, searchNext);

      for (const pkg of results.objects) {
        tarballUrlUpdate(req, pkg.package);
      }

      return res.status(200).json(results);
    } catch (e) {
      return next(e);
    }
  };
};

export { searchGet };
