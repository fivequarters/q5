import { Response, Request } from 'express';
import { IFunctionApiRequest } from './request';
import { tarballUrlUpdate } from './tarballUrlUpdate';

import create_error from 'http-errors';

const revisionDelete = () => {
  return async (reqBase: Request, res: Response, next: any) => {
    const req = reqBase as IFunctionApiRequest;
    try {
      const pkg = await req.registry.get(req.params.name);
      const rev = req.params.revisionId;

      if (!pkg) {
        return next(create_error(404, 'package not found'));
      }

      if (pkg._rev === rev) {
        // Intends to delete the entire document
        await req.registry.delete(req.params.name);
      }
      return res.status(200).json(pkg);
    } catch (e) {
      return next(e);
    }
  };
};

const revisionPut = () => {
  return async (reqBase: Request, res: Response, next: any) => {
    const req = reqBase as IFunctionApiRequest;
    try {
      const pkg = await req.registry.get(req.params.name);

      if (!pkg) {
        return next(create_error(404, 'package not found'));
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
    } catch (e) {
      next(e);
    }
  };
};

export { revisionDelete, revisionPut };
