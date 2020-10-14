import { Response } from 'express';
import { IFunctionApiRequest } from './request';

const revisionDelete = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    const etag = req.headers['if-none-match'];
    const pkg = await req.registry.get(req.params.name);
    const rev = req.params.revisionId;

    if (pkg._rev === rev) {
      // Intends to delete the entire document
      req.registry.delete(req.params.name);
    }

    if (!pkg) {
      return res.status(404).json({ status: 404, statusCode: 404, message: 'package not found' });
    }

    // NYI: Probably want to actually delete a version here.

    res.set('ETag', pkg.etag);
    return res.status(200).json(pkg);
  };
};
export { revisionDelete };
