import { Response } from 'express';
import { IFunctionApiRequest } from './request';

const tarballGet = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    const pkgName = `${req.params.scope}/${req.params.filename}`;

    const pkg = await req.registry.get(`${req.params.scope}/${req.params.name}`);
    const tgz = await req.registry.tarballGet(pkgName);
    if (!tgz) {
      return res.status(404).json({ status: 404, statusCode: 404, message: `unknown pkg ${pkgName}` });
    }

    if (typeof tgz === 'string') {
      return res.redirect(tgz as string);
    }

    res.set('ETag', pkg.etag).status(200).send(tgz);
  };
};

const tarballDelete = () => {
  return async (req: IFunctionApiRequest, res: Response) => {
    const pkgName = `${req.params.scope}/${req.params.filename}`;

    const pkg = await req.registry.get(`${req.params.scope}/${req.params.name}`);
    await req.registry.tarballDelete(pkgName);

    res.set('ETag', pkg.etag).status(200).send({});
  };
};

export { tarballGet, tarballDelete };
