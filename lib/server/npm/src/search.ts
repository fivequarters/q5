import { Response } from 'express';
import { IFunctionApiRequest } from './request';

const searchGet = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    const pkg = await req.registry.get(req.query.text);
    if (!pkg) {
      return res.status(200).json({ objects: [], total: 0, time: new Date().toUTCString() });
    }

    return res.status(200).json({
      objects: [
        {
          package: pkg,
        },
      ],
      total: 1,
      time: new Date().toUTCString(),
    });
  };
};

export { searchGet };
