import * as Constants from '@5qtrs/constants';
import { KeyStore } from './KeyStore';
import { IFunctionApiRequest } from './Request';
import { Response } from 'express';

type ExpressHandler = (req: IFunctionApiRequest, res: any, next: any) => any;

const execAs = (keyStore: KeyStore, skipFunctionAccessToken: (req: IFunctionApiRequest) => boolean) => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    if (!req.functionSummary || skipFunctionAccessToken(req)) {
      return next();
    }

    try {
      const jwt = await mintJwtForPermissions(
        keyStore,
        req.params,
        Constants.getFunctionPermissions(req.functionSummary)
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
  mode: string = 'exec',
  attributes: any = {}
): Promise<string | undefined> => {
  if (!permissions) {
    return undefined;
  }

  const payload: { [key: string]: any } = {
    sub: Constants.makeFunctionSub(params, mode),
  };

  payload[Constants.JWT_PERMISSION_CLAIM] = permissions;
  payload[Constants.JWT_PROFILE_CLAIM] = {
    accountId: params.accountId,
    subscriptionId: params.subscriptionId,

    // Include a @fusebit.io email to prevent customer analytics from tracking
    email: 'function+role@fusebit.io',
    ...attributes,
  };

  // Create a JWT
  return keyStore.signJwt(payload);
};

export { execAs, mintJwtForPermissions };
