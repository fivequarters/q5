import create_error from 'http-errors';

import { get_function_tags, Constants as Tags } from '@5qtrs/function-tags';
import { IFunctionApiRequest } from './Request';

const loadSummary = () => {
  return (req: IFunctionApiRequest, res: Response, next: any) => {
    if (!req.params.accountId) {
      return next(create_error(403, 'Unable to acquire "accountId"'));
    }

    return get_function_tags(
      {
        accountId: req.params.accountId,
        subscriptionId: req.params.subscriptionId,
        boundaryId: req.params.boundaryId,
        functionId: req.params.functionId,
      },
      (e: any, d: any) => {
        if (e) {
          return next(e);
        }
        req.functionSummary = d;
        if (req.functionSummary[Tags.get_compute_tag_key('permissions')]) {
          req.functionSummary[Tags.get_compute_tag_key('permissions')] = JSON.parse(
            req.functionSummary[Tags.get_compute_tag_key('permissions')] as string
          );
        }
        return next();
      }
    );
  };
};

export { loadSummary };
