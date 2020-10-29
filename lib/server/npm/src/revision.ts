import { Response } from 'express';
import { IFunctionApiRequest } from './request';
import { tarballUrlUpdate } from './tarballUrlUpdate';

const revisionDelete = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    const etag = req.headers['if-none-match'];
    const pkg = await req.registry.get(req.params.name);
    const rev = req.params.revisionId;

    if (!pkg) {
      return res.status(404).json({ status: 404, statusCode: 404, message: 'package not found' });
    }

    if (pkg._rev === rev) {
      // Intends to delete the entire document
      req.registry.delete(req.params.name);
    }

    res.set('ETag', pkg.etag);
    return res.status(200).json(pkg);
  };
};

const revisionPut = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    const etag = req.headers['if-none-match'];
    const pkg = await req.registry.get(req.params.name);
    const rev = req.params.revisionId;

    if (!pkg) {
      return res.status(404).json({ status: 404, statusCode: 404, message: 'package not found' });
    }

    if (pkg._rev === rev) {
      // Intends to delete the entire document
      await req.registry.delete(req.params.name);
    }

    // Save the version information for the preserved versions, specifically for the tarball configuration.
    Object.keys(req.body.versions).forEach((v: any) => {
      req.body.versions[v] = pkg.versions[v];
    });

    // Copy into the object
    pkg['dist-tags'] = req.body['dist-tags'];
    pkg.versions = req.body.versions;

    await req.registry.put(pkg.name, pkg);
    tarballUrlUpdate(req, pkg);

    // NYI: Probably want to actually delete a version from S3.

    res.set('ETag', pkg.etag);
    return res.status(200).json(pkg);
  };
};
export { revisionDelete, revisionPut };
