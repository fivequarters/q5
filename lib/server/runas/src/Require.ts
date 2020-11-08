import { Constants as Tags } from '@5qtrs/function-tags';
import { Permissions } from '@5qtrs/constants';
import create_error from 'http-errors';

import { IFunctionApiRequest } from './Request';

type ExpressHandler = (req: IFunctionApiRequest, res: any, next: any) => any;
type AuthorizationFactory = (options: any) => ExpressHandler;

export const checkRequirements = (authorize: AuthorizationFactory) => {
  return (req: IFunctionApiRequest, res: any, next: any) => {
    const permissions = req.functionSummary[Tags.get_compute_tag_key('permissions')] as any;
    if (!permissions) {
      return next();
    }
    const requirements = permissions.require;
    if (requirements) {
      // First
      return authorize({ operation: Permissions.exeFunction })(req, res, (e: any) => {
        if (e) {
          return next(e);
        }

        // No additional requirements beyond function:exec
        if (requirements.length === 0) {
          return next();
        }

        console.log(
          `checkRequirements: ${JSON.stringify(requirements)} agent: ${JSON.stringify(req.resolvedAgent.agent.access)}`
        );

        // Make sure all requirements are a subset of the agent's permissions
        return req.resolvedAgent
          .checkPermissionSubset({ allow: requirements })
          .then(() => next())
          .catch(() => next(create_error(403, 'Insufficient permissions')));
      });
    }
    next();
  };
};
