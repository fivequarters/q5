import express, { Request, Response, NextFunction } from 'express';
import npmApp from './npm';
import create_error from 'http-errors';
import url from 'url';
// @ts-ignore
import validate_schema from '../middleware/validate_schema';
// @ts-ignore
import authorize from '../middleware/authorize';
// @ts-ignore
import api_params from '../schemas/api_params';
// @ts-ignore
import registry_specification from '../schemas/registry_specification';

import { IFunctionApiRequest } from '@5qtrs/npm';
import { AwsRegistry } from '@5qtrs/registry';
import * as Constants from '@5qtrs/constants';


const registryApp = express.Router();

registryApp.options('/');
registryApp.get(
  '/',
  validate_schema({ params: api_params }),
  authorize({ operation: 'registry:get' }),
  async (reqGeneral: Request, res: Response, next: NextFunction) => {
    const req = reqGeneral as IFunctionApiRequest;
    try {
      const config = await req.registry.configGet();
      res.status(200).json({
        ...config,
        url: `${process.env.API_SERVER}/v1${url.parse(req.url).pathname}npm/`,
      });
    } catch (e) {
      next(e);
    }
  }
);

registryApp.put(
  '/',
  authorize({ operation: 'registry-config:put' }),
  express.json(),
  validate_schema({ params: api_params }),
  validate_schema({ body: registry_specification }),
  async (reqGeneral, res, next) => {
    const req = reqGeneral as IFunctionApiRequest;
    try {
      // Exclude the existing scopes that match the reserved prefix
      const internalConfig = await (req.registry as AwsRegistry).internalConfigGet();

      // Filter out any of the global scopes - allows easy roundtrip by the caller.
      req.body.scopes = req.body.scopes.filter((s: string) => internalConfig.global.scopes.indexOf(s) === -1);

      // Make sure none of the scopes specified interfere with the reserved scope prefix.
      if (req.body.scopes.some((s: string) => s.indexOf(Constants.REGISTRY_RESERVED_SCOPE_PREFIX) !== -1)) {
        return next(
          create_error(400, `Scopes starting with '${Constants.REGISTRY_RESERVED_SCOPE_PREFIX}' are not allowed`)
        );
      }
      await req.registry.configPut(req.body);
      res.status(200).end();
    } catch (e) {
      next(e);
    }
  }
);

registryApp.delete(
  '/',
  authorize({ operation: 'registry-config:delete' }),
  express.json(),
  validate_schema({ params: api_params }),
  async (reqGeneral, res, next) => {
    const req = reqGeneral as IFunctionApiRequest;
    try {
      await req.registry.configDelete();
      res.status(200).end();
    } catch (e) {
      next(e);
    }
  }
);



export default (routeNamespace: string) => {
  // FIXME: this is a temporary fix because of a bug in libnpm.
  // once the bug is resolved, we will remove this as a function and simply `export default registryApp`
  // the below `.use` will be staticly defined like all other routes in this file
  //
  // libnpm issue: https://github.com/npm/libnpmpublish/issues/5
  registryApp.use('/npm', npmApp(`${routeNamespace}/npm`));
  return registryApp;
}
