import * as Constants from '@5qtrs/constants';
import create_error from 'http-errors';

import { IFunctionApiRequest, IFunctionParams, IFunctionSummary } from './Request';
import { getMatchingRoute } from './Routes';

type ExpressHandler = (req: IFunctionApiRequest, res: any, next: any) => any;
type AuthorizationFactory = (options: any) => ExpressHandler;

export const pickAuthorization = (method: string, params: IFunctionParams, functionSummary: IFunctionSummary) => {
  let authz = Constants.getFunctionAuthorization(functionSummary);
  let authn = Constants.getFunctionAuthentication(functionSummary);
  const route = (params.matchingRoute = getMatchingRoute(functionSummary, params));

  if (route) {
    if (route.security) {
      // Route level security requirements take precedence over function level security requirements
      authn = route.security.authentication;
      authz = route.security.authorization;
    } else if (route.task && method === 'POST') {
      // If a route is a task and request is a task scheduling request and the route does not specify
      // security requirements explicitly, enforce default task security
      authn = 'required';
      authz = [
        {
          action: 'function:schedule',
          resource: `/account/${params.accountId}/subscription/${params.subscriptionId}/boundary/${params.boundaryId}/function/${params.functionId}/`,
        },
      ];
    }
  }

  return { authorization: authz, authentication: authn };
};

export const checkAuthorization = (authorize: AuthorizationFactory) => {
  const authorizer = authorize({ failByCallback: true });
  return (req: IFunctionApiRequest, res: any, next: any) => {
    const { authorization, authentication } = pickAuthorization(req.method, req.params, req.functionSummary);

    const callerJwt = req.headers.authorization;

    if (!authentication || authentication === 'none' || (authentication === 'optional' && !callerJwt)) {
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
