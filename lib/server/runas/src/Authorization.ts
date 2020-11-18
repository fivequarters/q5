import * as Constants from '@5qtrs/constants';
import create_error from 'http-errors';

import { IFunctionApiRequest } from './Request';

type ExpressHandler = (req: IFunctionApiRequest, res: any, next: any) => any;
type AuthorizationFactory = (options: any) => ExpressHandler;

export const checkAuthorization = (authorize: AuthorizationFactory) => {
  return (req: IFunctionApiRequest, res: any, next: any) => {
    const authorizations = Constants.getFunctionAuthorizations(req.functionSummary);

    // No authorizations, or an empty authorization array - do nothing.
    if (!authorizations || authorizations.length === 0) {
      return next();
    }

    // Validate against the first permission, then use resolvedAgent to evaluate the rest of the
    // authorization requirements.
    return authorize({})(req, res, (e: any) => {
      if (e) {
        return next(e);
      }

      // Make sure all requirements are a subset of the agent's permissions
      return req.resolvedAgent
        .checkPermissionSubset({ allow: authorizations })
        .then(() => next())
        .catch(() => next(create_error(403, 'Insufficient permissions')));
    });
  };
};
