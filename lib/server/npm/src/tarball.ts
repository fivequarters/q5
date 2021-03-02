import { Response, Request } from 'express';
import { IFunctionApiRequest } from './request';

import create_error from 'http-errors';

const tarballGet = () => {
  return async (reqGeneric: Request, res: Response, next: any) => {
    const req = reqGeneric as IFunctionApiRequest;
    try {
      const pkgName = `${req.params.scope}/${req.params.filename}`;

      const pkg = await req.registry.get(`${req.params.scope}/${req.params.name}`);
      const tgz = await req.registry.tarballGet(pkgName);
      if (!tgz) {
        return next(create_error(404, `unknown pkg ${pkgName}`));
      }

      if (typeof tgz === 'string') {
        return res.redirect(tgz as string);
      }

      res.set('ETag', pkg.etag).status(200).send(tgz);
    } catch (e) {
      return next(e);
    }
  };
};

const tarballDelete = () => {
  return async (reqGeneric: Request, res: Response, next: any) => {
    const req = reqGeneric as IFunctionApiRequest;
    console.log('hit tarball delete')
    try {
      const pkgName = `${req.params.scope}/${req.params.filename}`;

      const pkg = await req.registry.get(`${req.params.scope}/${req.params.name}`);
      await req.registry.tarballDelete(pkgName);

      res.set('ETag', pkg.etag).status(200).end();
    } catch (e) {
      return next(e);
    }
  };
};

export { tarballGet, tarballDelete };
