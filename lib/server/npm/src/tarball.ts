import { Response } from 'express';
import { IFunctionApiRequest } from './request';

const tarballGet = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    const pkgName = `${req.params.scope ? req.params.scope + '/' : ''}${req.params.name}`;

    const pkg = req.registry.get(pkgName);
    const tgz = req.registry.tarball(pkgName);
    if (!tgz) {
      res.status(404).json({ status: 404, statusCode: 404, message: `unknown pkg ${pkgName}` });
    }

    // 303 Redirects are supported by the client, if we want to return a signed url to S3.
    res.set('ETag', pkg.etag).status(200).send(tgz);
  };
};

export { tarballGet };
