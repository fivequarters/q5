import * as Constants from '@5qtrs/constants';
import { Constants as Tags } from '@5qtrs/function-tags';
import { KeyStore } from './KeyStore';
import { IFunctionApiRequest } from './Request';

type ExpressHandler = (req: IFunctionApiRequest, res: any, next: any) => any;

const execAs = (keyStore: KeyStore) => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    if (!req.functionSummary || !req.functionSummary[Tags.get_compute_tag_key('permissions')]) {
      return next();
    }

    const payload: { [key: string]: any } = {
      sub: Constants.makeFunctionSub(req.params, 'exec'),
    };

    payload[Constants.JWT_PERMISSION_CLAIM] = JSON.parse(
      req.functionSummary[Tags.get_compute_tag_key('permissions')] as string
    );

    // Create a JWT
    const jwt = await keyStore.signJwt(payload);

    // Specify it into the request so it gets passed into the executor.
    req.params.functionAccessToken = jwt;

    return next();
  };
};

export { execAs };
