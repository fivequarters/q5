import * as Constants from '@5qtrs/constants';
import create_error from 'http-errors';

import { IFunctionApiRequest } from './Request';

type ExpressHandler = (req: IFunctionApiRequest, res: any, next: any) => any;
type AuthorizationFactory = (options: any) => ExpressHandler;

export const checkAuthorization = (authorize: AuthorizationFactory) => {
  const authorizer = authorize({ failByCallback: true });
  return (req: IFunctionApiRequest, res: any, next: any) => {
    const authentication = Constants.getFunctionAuthentication(req.functionSummary);
    const authorization = Constants.getFunctionAuthorization(req.functionSummary);
    const callerJwt = req.headers.authorization;

    if (authentication === 'none' || (authentication === 'optional' && !callerJwt)) {
      return next();
    }

    return authorizer(req, res, async (e: any) => {
      if (e) {
        return next(authentication === 'required' ? create_error(403, 'Unauthorized') : undefined);
      }

      // No explicit authorization permissions only requires a valid JWT from the caller
      if (!authorization || authorization.length === 0) {
        return next();
      }

      // Make sure all requirements are a subset of the agent's permissions
      try {
        await req.resolvedAgent.checkPermissionSubset({ allow: authorization });
      } catch (e) {
        return next(create_error(403, 'Unauthorized'));
      }

      return next();
    });
  };
};
