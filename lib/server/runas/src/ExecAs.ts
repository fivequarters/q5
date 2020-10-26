import { IFunctionApiRequest } from './Request';
import { Constants as Tags } from '@5qtrs/function-tags';
import { KeyStore } from './KeyStore';

type ExpressHandler = (req: IFunctionApiRequest, res: any, next: any) => any;

type AuthorizationFactory = (options: any) => ExpressHandler;

const execAs = (authorize: AuthorizationFactory, keyStore: KeyStore) => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    if (!req.functionSummary || !req.functionSummary[Tags.get_compute_tag_key('permissions')]) {
      return next();
    }

    const payload: any = {
      sub: `uri:function:${req.params.accountId}:${req.params.subscriptionId}:${req.params.boundaryId}:${req.params.functionId}`,
    };

    if (req.headers.authorization) {
      // There's an existing authorization header - validate it and add it to the JWT for auditing purposes.
      const err = await new Promise((resolve, reject) => authorize({})(req, res, (e: any) => resolve(e)));
      if (err) {
        return next(err);
      }

      if (req.resolvedAgent || req.resolvedAgent.identities.length >= 1) {
        const { issuerId, subject } = req.resolvedAgent.identities[0];
        payload.behalfOf = `${issuerId}:${subject}`;
      }
    }

    payload.perm = req.functionSummary[Tags.get_compute_tag_key('permissions')];

    // Create a JWT
    const jwt = await keyStore.signJwt(payload);

    // Specify it into the request so it gets passed into the executor.
    req.headers.authorization = jwt;
  };
};
