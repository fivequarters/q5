import create_error from 'http-errors';

import { get_function_tags, Constants as Tags } from '@5qtrs/function-tags';
import { IFunctionApiRequest, IFunctionSummary } from './Request';

import { get_security_tag_key, getFunctionVersion, get_routes_tag_key } from '@5qtrs/constants';

import { Response } from 'express';

const loadSummary = () => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    try {
      req.functionSummary = await loadFunctionSummary(req.params);
      req.params.version = getFunctionVersion(req.functionSummary);
      return next();
    } catch (e) {
      return next(e);
    }
  };
};

const loadFunctionSummary = async (params: any): Promise<IFunctionSummary> => {
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

        if (functionSummary[get_security_tag_key('permissions')]) {
          functionSummary[get_security_tag_key('permissions')] = JSON.parse(
            functionSummary[get_security_tag_key('permissions')] as string
          );
        }

        if (functionSummary[get_security_tag_key('authorization')]) {
          functionSummary[get_security_tag_key('authorization')] = JSON.parse(
            functionSummary[get_security_tag_key('authorization')] as string
          );
        }

        if (functionSummary[get_routes_tag_key()]) {
          functionSummary[get_routes_tag_key()] = JSON.parse(functionSummary[get_routes_tag_key()] as string);
        }

        return resolve(functionSummary);
      }
    );
  });
};

export { loadSummary, loadFunctionSummary };
