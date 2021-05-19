import create_error from 'http-errors';

import { AwsKeyStore, loadFunctionSummary, mintJwtForPermissions } from '@5qtrs/runas';
import { IRegistryStore } from '@5qtrs/registry';
import { IAgent } from '@5qtrs/account-data';
import * as Constants from '@5qtrs/constants';
import { createLoggingCtx } from '@5qtrs/runtime-common';

import * as provider_handlers from './handlers/provider_handlers';
import * as ratelimit from './middleware/ratelimit';
import { getResolvedAgent } from './account';

interface IParams {
  accountId: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;

  // Parameters that get slipped in as part of invocation
  functionAccessToken?: string;
  logs?: any;
}

interface IFunctionSpecification extends IParams {
  id: string;
  environment: 'nodejs';
  provider: 'lambda';
  configuration?: any;
  configurationSerialized?: string;
  nodejs: {
    files: { [key: string]: string };
  };
  metadata?: any;
  compute?: {
    memorySize: number;
    timeout: number;
    staticIp: boolean;
  };
  computeSerialized?: string;
  schedule?: {
    cron: string;
    timezone: string;
  };
  scheduleSerialized?: string;
  security?: {
    authentication?: string;
    authorization: any;
    functionPermissions: any;
  };
}

interface IResult {
  code?: number;
  body?: string | object;
  bodyEncoding?: string;
  headers: any;
  json: (val: any) => void;
  status: (status: number) => void;
  set: (key: string, value: string) => void;
  end: (body?: string, bodyEncoding?: string) => void;
}

let keyStore: AwsKeyStore;
let subscriptionCache: any;

const initFunctions = (ks: AwsKeyStore, sc: any) => {
  keyStore = ks;
  subscriptionCache = sc;
};

const asyncDispatch = async (req: any, handler: any): Promise<IResult> => {
  const res: IResult = await new Promise((resolve, reject) => {
    const result: IResult = {
      code: undefined,
      body: undefined,
      bodyEncoding: undefined,
      headers: {},
      json(val: any) {
        this.code = this.code || 200;
        this.body = val;
        resolve(result);
      },
      status(status: number) {
        this.code = status;
      },
      set(key: string, value: string) {
        this.headers[key] = value;
      },
      end(body?: string, bodyEncoding?: string) {
        if (!body) {
          return resolve(result);
        }
        this.body = body;
        this.bodyEncoding = bodyEncoding;
        return resolve(result);
      },
    };
    handler(req, res, reject);
  });
  return res;
};

const createFunction = async (
  params: IParams,
  spec: IFunctionSpecification,
  resolvedAgent: IAgent,
  registry: IRegistryStore
): Promise<IResult> => {
  const url = new URL(process.env.API_SERVER as string);
  const req = {
    protocol: url.protocol.replace(':', ''),
    headers: { host: url.host },
    params,
    body: spec,
    keyStore,
    resolvedAgent,
    registry,
  };
  return asyncDispatch(req, provider_handlers.lambda.put_function);
};

const deleteFunction = async (params: IParams): Promise<IResult> => {
  return asyncDispatch({ params }, provider_handlers.lambda.delete_function);
};

const checkAuthorization = async (accountId: string, functionSummary: string, authToken: string, operation: any) => {
  const authentication = Constants.getFunctionAuthentication(functionSummary);
  if (!authentication || authentication === 'none' || (authentication === 'optional' && !authToken)) {
    return undefined;
  }

  const resolvedAgent = await getResolvedAgent(accountId, authToken);

  if (operation) {
    const resource = operation.path;
    const action = operation.operation;
    const { issuerId, subject } = resolvedAgent.identities[0];

    await resolvedAgent.ensureAuthorized(action, resource);
  }

  const functionAuthz = Constants.getFunctionAuthorization(functionSummary);
  await resolvedAgent.checkPermissionSubset({ allow: functionAuthz });
};

/*
 * TBD a bit on how much of the authorization flow it's desired to go through for this.  Right now it's
 * assumed to be fully permissioned.
 */
const executeFunction = async (
  params: IParams,
  resolvedAgent: any, // await getResolvedAgent(accountId, jwt);
  loggingHost: string,
  method: string,
  url: string,
  body?: any,
  headers: any = {},
  query: any = {}
): Promise<IResult> => {
  let sub;
  try {
    sub = await subscriptionCache.find(params.subscriptionId);
  } catch (e) {
    throw create_error(404, 'subscription not found');
  }

  const functionSummary = await loadFunctionSummary(params);
  const functionAuthz = Constants.getFunctionAuthorization(functionSummary);
  const functionPerms = Constants.getFunctionPermissions(functionSummary);

  // Guarantee a release regardless of the exceptions that occur later by using a finally{} clause to call
  // the releaseRate function.
  const releaseRate = ratelimit.checkRateLimit(sub, params.subscriptionId);
  try {
    if (resolvedAgent) {
      await resolvedAgent.checkPermissionSubset({ allow: functionAuthz });
    }
    params.functionAccessToken = await mintJwtForPermissions(keyStore, params, functionPerms);
    const loggingUrl = new URL(loggingHost);
    params.logs = await createLoggingCtx(keyStore, params, loggingUrl.protocol.replace(':', ''), loggingUrl.host);

    // execute
    const apiUrl = new URL(process.env.API_SERVER as string);
    const req = {
      protocol: apiUrl.protocol.replace(':', ''),
      headers: { ...headers, host: apiUrl.host },
      params,
      method,
      body,
      url,
      originalUrl: url,
      baseUrl: url,
      query,
      keyStore,
      resolvedAgent,
    };
    return await asyncDispatch(req, provider_handlers.lambda.invoke_function);
  } finally {
    releaseRate();
  }
};

// Some example handler implementations, for reference at the moment.
const executeHandler = async (req: any, res: any, next: any) => {
  try {
    const result = await executeFunction(
      req.params,
      req.resolvedAgent,
      process.env.LOGS_HOST as string,
      req.method,
      req.url,
      req.body,
      req.headers,
      req.query
    );
    if (!result) {
      return res.status(200).end();
    }
    res.status(result.status);
    res.set(result.headers);
    if (result.bodyEncoding) {
      res.end(result.body, result.bodyEncoding);
    } else {
      res.json(result.body);
    }
  } catch (e) {
    return next(e);
  }
};

const createHandler = async (req: any, res: any, next: any) => {
  let result;
  try {
    result = await createFunction(req.params, req.body, req.resolvedAgent, req.registry);
  } catch (e) {
    return next(e);
  }
  res.status(result.code);
  if (result.body) {
    return res.json(result.body);
  }
  return res.end();
};

export { createFunction, deleteFunction, executeFunction, checkAuthorization, initFunctions };
