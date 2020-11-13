import create_error from 'http-errors';

import { get_function_tags, Constants as Tags } from '@5qtrs/function-tags';
import { IFunctionApiRequest } from './Request';

const loadSummary = () => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    try {
      req.functionSummary = await loadFunctionSummary(req.params);
      return next();
    } catch (e) {
      return next(e);
    }
  };
};

const loadFunctionSummary = async (params: any): Promise<any> => {
  if (!params.accountId) {
    throw create_error(403, 'Unable to acquire "accountId"');
  }

  return new Promise((resolve, reject) => {
    return get_function_tags(
      {
        accountId: params.accountId,
        subscriptionId: params.subscriptionId,
        boundaryId: params.boundaryId,
        functionId: params.functionId,
      },
      (e: any, d: any) => {
        if (e) {
          return reject(e);
        }
        const functionSummary = d;
        if (functionSummary[Tags.get_compute_tag_key('permissions')]) {
          functionSummary[Tags.get_compute_tag_key('permissions')] = JSON.parse(
            functionSummary[Tags.get_compute_tag_key('permissions')] as string
          );
        }
        return resolve(functionSummary);
      }
    );
  });
};

export { loadSummary, loadFunctionSummary };
