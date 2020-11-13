import * as Constants from '@5qtrs/constants';
import { Constants as Tags } from '@5qtrs/function-tags';
import { KeyStore } from './KeyStore';
import { IFunctionApiRequest } from './Request';

type ExpressHandler = (req: IFunctionApiRequest, res: any, next: any) => any;

const execAs = (keyStore: KeyStore) => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    try {
      if (!req.functionSummary) {
        next();
      }

      const jwt = await mintJwtForPermissions(
        keyStore,
        req.params,
        req.functionSummary[Tags.get_compute_tag_key('permissions')]
      );

      // Specify it into the request so it gets passed into the executor.
      req.params.functionAccessToken = jwt;

      return next();
    } catch (e) {
      return next(e);
    }
  };
};

const mintJwtForPermissions = async (
  keyStore: KeyStore,
  params: any,
  permissions: any,
  mode: string = 'exec'
): Promise<string | undefined> => {
  if (!permissions) {
    return undefined;
  }

  const payload: { [key: string]: any } = {
    sub: Constants.makeFunctionSub(params, mode),
  };

  payload[Constants.JWT_PERMISSION_CLAIM] = permissions;

  // Create a JWT
  return keyStore.signJwt(payload);
};

export { execAs, mintJwtForPermissions };
