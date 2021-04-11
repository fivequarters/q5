/**
 * Creates Express middleware that authorizes the call using Fusebit security. For example, the following
 * will only execute the Express handler if the access token supplied by the caller has the function:execute
 * permission on the function resource.
 *
 * app.get('/myendpoint',
 *   authorize({
 *     action: 'function:execute',
 *     resourceFactory: req => {
 *     const { accountId, subscriptionId, boundaryId, functionId } = req.fusebit;
 *     `/account/{accountId}/subscription/{subscriptionId}/boundary/${boundaryId}/function/${functionId}/myendpoint/`
 *     }),
 *   handler
 * );
 *
 * @param {object} param Object with action and resourceFactory properties
 */
function authorize({ action, resourceFactory }: any) {
  const actionTokens = action.split(':');
  return async (req: any, res: any, next: any) => {
    const resource = resourceFactory(req);
    try {
      if (!req.fusebit.caller.permissions) {
        throw new Error('The caller was not authenticated.');
      }
      for (const permission of req.fusebit.caller.permissions.allow) {
        if (resource.indexOf(permission.resource) !== 0) {
          continue;
        }
        const actualActionTokens = permission.action.split(':');
        let match = true;
        for (let i = 0; i < actionTokens.length; i++) {
          if (actionTokens[i] !== actualActionTokens[i]) {
            match = actualActionTokens[i] === '*';
            break;
          }
        }
        if (match) {
          return next();
        }
      }
      throw new Error('Caller does not have sufficient permissions.');
    } catch (e) {
      Sdk.debug('FAILED AUTHORIZATION CHECK', e.message, action, resource, req.fusebit.caller.permissions);
      res.status(403).send({ status: 403, statusCode: 403, message: 'Unauthorized' });
      return;
    }
  };
}

const Sdk: { debug: (...s: any[]) => void } = { debug: console.log };

interface IOAuthConfig {
  authorizationUrl: string;
  audience: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  vendorPrefix: string;
  extraParams: string;
  scope: string;
  accessTokenExpirationBuffer: number;
  refreshErrorLimit: number;
  refreshWaitCountLimit: number;
  refreshInitialBackoff: number;
  refreshBackoffIncrement: number;
}

interface IStorage {
  get: (key: string) => Promise<any>;
  put: (data: any, key: string) => Promise<string>;
  delete: (key: string | undefined, flag?: boolean) => Promise<any>;
}
export { authorize, Sdk, IOAuthConfig, IStorage };
