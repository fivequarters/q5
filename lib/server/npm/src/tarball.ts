import { Response, Request } from 'express';
import { IFunctionApiRequest } from './request';

import create_error from 'http-errors';

const tarballGet = () => {
  return async (reqBase: Request, res: Response, next: any) => {
    const req = reqBase as IFunctionApiRequest;
    try {
      const pkgName = `${req.params.scope}/${req.params.filename}`;

      const pkg = await req.registry.get(`${req.params.scope}/${req.params.name}`);
      const tgz = await req.registry.tarballGet(pkgName);

      if (!pkg || !tgz) {
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
  return async (reqBase: Request, res: Response, next: any) => {
    const req = reqBase as IFunctionApiRequest;
    try {
      const pkgName = `${req.params.scope}/${req.params.filename}`;

      const pkg = await req.registry.get(`${req.params.scope}/${req.params.name}`);
      await req.registry.tarballDelete(pkgName);

      res.set('ETag', pkg.etag).status(200).send({});
    } catch (e) {
      return res.status(500).end();
    }
  };
};

export { tarballGet, tarballDelete };
