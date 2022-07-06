import * as Constants from '@5qtrs/constants';
import create_error from 'http-errors';

import { IFunctionApiRequest } from './Request';
import { getMatchingRoute } from './Routes';

type ExpressHandler = (req: IFunctionApiRequest, res: any, next: any) => any;
type AuthorizationFactory = (options: any) => ExpressHandler;

export const checkAuthorization = (authorize: AuthorizationFactory) => {
  const authorizer = authorize({ failByCallback: true });
  return (req: IFunctionApiRequest, res: any, next: any) => {
    let authentication = Constants.getFunctionAuthentication(req.functionSummary);
    let authorization = Constants.getFunctionAuthorization(req.functionSummary);
    const route = (req.params.matchingRoute = getMatchingRoute(req.functionSummary, req.params));
    if (route) {
      if (route.security) {
        // Route level security requirements take precedence over function level security requirements
        authentication = route.security.authentication;
        authorization = route.security.authorization;
      } else if (route.task && req.method === 'POST') {
        // If a route is a task and request is a task scheduling request and the route does not specify
        // security requirements explicitly, enforce default task security
        authentication = 'required';
        authorization = [
          {
            action: 'function:schedule',
            resource: `/account/${req.params.accountId}/subscription/${req.params.subscriptionId}/boundary/${req.params.boundaryId}/function/${req.params.functionId}/`,
          },
        ];
      }
    }

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
