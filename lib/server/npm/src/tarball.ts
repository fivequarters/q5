import { Response } from 'express';
import { IFunctionApiRequest } from './request';

const tarballGet = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    const pkgName = `${req.params.scope ? req.params.scope + '/' : ''}${req.params.name}`;

    const pkg = await req.registry.get(pkgName);
    const tgz = await req.registry.tarball(pkgName);
    if (!tgz) {
      res.status(404).json({ status: 404, statusCode: 404, message: `unknown pkg ${pkgName}` });
    }

    if (typeof tgz === 'string') {
      return res.redirect(tgz as string);
    }

    res.set('ETag', pkg.etag).status(200).send(tgz);
  };
};

export { tarballGet };
