import create_error from 'http-errors';
import { IncomingHttpHeaders } from 'http';

import { loadFunctionSummary, mintJwtForPermissions } from '@5qtrs/runas';
import { AwsRegistry } from '@5qtrs/registry';
import { IAgent } from '@5qtrs/account-data';
import * as Constants from '@5qtrs/constants';
import { createLoggingCtx } from '@5qtrs/runtime-common';

import { keyStore, subscriptionCache } from './globals';
import * as provider_handlers from './handlers/provider_handlers';
import * as ratelimit from './middleware/ratelimit';
import { getResolvedAgent } from './account';

const BUILD_POLL_DELAY = 1000;

interface IParams {
  accountId: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;

  // Parameters that get slipped in as part of invocation
  baseUrl?: string;
  version?: number;
  functionAccessToken?: string;
  logs?: any;
}

interface IFunctionSpecification {
  id?: string;
  environment?: 'nodejs';
  provider?: 'lambda';
  configuration?: any;
  configurationSerialized?: string;
  nodejs: {
    files: { [key: string]: string | object };
  };
  metadata?: any;
  compute?: {
    memorySize?: number;
    timeout?: number;
    staticIp?: boolean;
  };
  computeSerialized?: string;
  schedule?: {
    cron?: string;
    timezone?: string;
  };
  scheduleSerialized?: string;
  security?: {
    authentication?: string;
    authorization?: any;
    functionPermissions?: any;
  };
}

interface ICreateFunction {
  code: number;
  status?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
  location?: string;
  buildId?: string;
}

export interface IExecuteFunctionOptions {
  token?: string;
  headers?: IncomingHttpHeaders;
  body?: string | object;
  query?: object;
  originalUrl?: string;
}

interface IExecuteFunction {
  body: any;
  bodyEncoding?: string;
  code: number;
  error?: any;
  headers?: any;
}

interface IWaitForFunction {
  code: number;
  version: number;
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

const asyncDispatch = async (req: any, handler: any): Promise<any> => {
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
    handler(req, result, (err: any) => (err ? reject(err) : resolve()));
  });
  return res;
};

const createFunction = async (
  params: IParams,
  spec: IFunctionSpecification,
  resolvedAgent: IAgent
): Promise<ICreateFunction> => {
  const url = new URL(process.env.API_SERVER as string);
  const subscription = await subscriptionCache.get(params.accountId, params.subscriptionId);
  if (!subscription) {
    throw create_error(400, `Unknown account/subscription: ${params.accountId}/${params.subscriptionId}`);
  }

  const registry = AwsRegistry.create({ accountId: params.accountId, registryId: 'default' });
  const req = {
    protocol: url.protocol.replace(':', ''),
    headers: { host: url.host },
    params,
    body: spec,
    keyStore,
    resolvedAgent,
    subscription,
    registry,
  };
  const res = await asyncDispatch(req, provider_handlers.lambda.put_function);
  if (res.body && typeof res.body === 'object') {
    return { code: res.code, ...res.body };
  }
  return { code: res.code };
};

const waitForFunctionBuild = async (
  params: IParams,
  buildId: string,
  noLongerThan: number
): Promise<IWaitForFunction> => {
  const startTime = Date.now();
  const req = {
    params: { ...params, buildId },
  };

  do {
    const res = await asyncDispatch(req, provider_handlers.lambda.get_function_build);
    if (res.code === 200) {
      return { code: res.code, version: res.body.version };
    }
    if (res.code === 201) {
      await new Promise((resolve) => setTimeout(resolve, BUILD_POLL_DELAY));
      continue;
    }

    throw create_error(res.code, res.body.message);
  } while (Date.now() < startTime + noLongerThan);

  throw create_error(408);
};

const deleteFunction = async (params: IParams): Promise<any> => {
  const res = await asyncDispatch({ params }, provider_handlers.lambda.delete_function);
  if (res.body) {
    return res.body;
  }
  return { code: res.code };
};

const checkAuthorization = async (
  accountId: string,
  functionSummary: string,
  authToken?: string | undefined,
  operation?: { operation: string; path: string }
) => {
  const authentication = Constants.getFunctionAuthentication(functionSummary);
  if (!authentication || authentication === 'none' || (authentication === 'optional' && !authToken)) {
    return undefined;
  }

  try {
    const resolvedAgent = await getResolvedAgent(accountId, authToken);

    if (operation) {
      const resource = operation.path;
      const action = operation.operation;

      await resolvedAgent.ensureAuthorized(action, resource);
    }

    const functionAuthz = Constants.getFunctionAuthorization(functionSummary);
    await resolvedAgent.checkPermissionSubset({ allow: functionAuthz });

    return resolvedAgent;
  } catch (error) {
    if (authentication === 'optional') {
      return undefined;
    }
    throw Error(error);
  }
};

/*
 * TBD a bit on how much of the authorization flow it's desired to go through for this.  Right now it's
 * assumed to be fully permissioned.
 */
const executeFunction = async (
  params: IParams,
  method: string,
  url: string = '',
  options: IExecuteFunctionOptions = {}
): Promise<IExecuteFunction> => {
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
    const resolvedAgent = await checkAuthorization(params.accountId, functionSummary, options.token, undefined);

    // execute
    const baseUrl = Constants.get_function_location({}, params.subscriptionId, params.boundaryId, params.functionId);
    const apiUrl = baseUrl + url;

    const parsedBaseUrl = new URL(baseUrl);
    const parsedUrl = new URL(apiUrl);

    params = { ...params, baseUrl, version: Constants.getFunctionVersion(functionSummary) };

    params.functionAccessToken = await mintJwtForPermissions(keyStore, params, functionPerms);
    params.logs = await createLoggingCtx(keyStore, params, 'https', process.env.LOGS_HOST);

    const req = {
      protocol: parsedUrl.protocol.replace(':', ''),
      headers: { ...(options.headers ? options.headers : {}), host: parsedUrl.host },
      params,
      method,
      body: options.body,
      query: options.query,

      url: parsedUrl.pathname.replace(/^\/v1/, ''),
      originalUrl: parsedUrl.pathname,
      baseUrl: '/v1',

      keyStore,
      resolvedAgent,

      functionSummary,
    };

    const res = await asyncDispatch(req, provider_handlers.lambda.execute_function);
    return { body: res.body, bodyEncoding: res.bodyEncoding, code: res.code, error: res.error, headers: res.headers };
  } finally {
    releaseRate();
  }
};

export {
  createFunction,
  deleteFunction,
  executeFunction,
  waitForFunctionBuild,
  IFunctionSpecification,
  IExecuteFunction,
};
