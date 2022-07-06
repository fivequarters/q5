import create_error from 'http-errors';
import { IncomingHttpHeaders } from 'http';

import { loadFunctionSummary, mintJwtForPermissions, IFunctionSummary, getMatchingRoute, IRoute } from '@5qtrs/runas';
import { AwsRegistry } from '@5qtrs/registry';
import { IAgent } from '@5qtrs/account-data';
import * as Constants from '@5qtrs/constants';
import {
  createLoggingCtx,
  dispatch_event,
  ISpanEvent,
  ILogEvent,
  isTaskSchedulingRequest,
} from '@5qtrs/runtime-common';

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
  functionPath?: string;
  matchingRoute?: IRoute;
}

type IExecuteParams = IParams & { functionPath: string };

interface IFunctionSecuritySpecification {
  authentication?: string;
  authorization?: any;
  functionPermissions?: any;
}

interface IFunctionSpecification {
  id?: string;
  environment?: 'nodejs';
  provider?: 'lambda';
  configuration?: any;
  configurationSerialized?: string;
  nodejs: {
    files: { [key: string]: string | object };
    encodedFiles?: { [key: string]: { data: string; encoding: string } };
  };
  metadata?: any;
  compute?: {
    memorySize?: number;
    timeout?: number;
    staticIp?: boolean;
    persistLogs?: boolean;
  };
  computeSerialized?: string;
  schedule?: {
    cron?: string;
    timezone?: string;
  };
  scheduleSerialized?: string;
  security?: IFunctionSecuritySpecification;
  fusebitEditor?: {
    runConfig: {
      method?: string;
      url?: string;
      payload?: Record<string, any>;
    }[];
  };
  routes?: {
    path: string;
    security?: IFunctionSecuritySpecification;
    task?: {
      maxPending?: number;
      maxRunning?: number;
    };
  };
}

interface ICreateFunction {
  code: number;
  status?: string;
  message?: string;
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

  apiVersion: 'v1' | 'v2';
  mode: 'request' | 'fanout' | 'cron';

  analytics?: {
    traceId?: string;
    parentSpanId?: string;
    spanId?: string;
  };
}

interface IExecuteRequest {
  protocol: string;
  headers: IncomingHttpHeaders & Record<string, string | string[] | undefined>;
  params: IParams;
  method: string;
  body: string | object | undefined;
  query: object | undefined;

  url: string;
  originalUrl: string;
  baseUrl: string;

  keyStore: typeof keyStore;
  resolvedAgent?: IAgent;

  functionSummary: any;

  startTime: number;
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
}

interface IExecuteFunction {
  body: any;
  bodyEncoding?: BufferEncoding;
  code: number;
  error?: any;
  headers?: any;
  functionLogs: ILogEvent[];
  functionSpans: ISpanEvent[];
}

interface IWaitForFunction {
  code: number;
  version: number;
}

interface IResult {
  statusCode?: number;
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
      statusCode: undefined,
      body: undefined,
      bodyEncoding: undefined,
      headers: {},
      json(val: any) {
        this.statusCode = this.statusCode || 200;
        this.body = val;
        resolve(result);
      },
      status(status: number) {
        this.statusCode = status;
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
    return { code: res.statusCode, ...res.body };
  }
  return { code: res.statusCode };
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
    if (res.statusCode === 200) {
      return { code: res.statusCode, version: res.body.version };
    }
    if (res.statusCode === 201) {
      await new Promise((resolve) => setTimeout(resolve, BUILD_POLL_DELAY));
      continue;
    }

    throw create_error(res.statusCode, res.body.message);
  } while (Date.now() < startTime + noLongerThan);

  throw create_error(408);
};

const deleteFunction = async (params: IParams): Promise<any> => {
  const res = await asyncDispatch({ params }, provider_handlers.lambda.delete_function);
  if (res.body) {
    return res.body;
  }
  return { code: res.statusCode };
};

const checkAuthorization = async (
  accountId: string,
  authToken: string | undefined,
  authentication: string | undefined,
  subset?: { action: string; resource: string }[],
  operation?: { action: string; resource: string }
): Promise<IAgent | undefined> => {
  if (!authentication || authentication === 'none' || (authentication === 'optional' && !authToken)) {
    return undefined;
  }

  try {
    const resolvedAgent = await getResolvedAgent(accountId, authToken);

    if (operation) {
      await resolvedAgent.ensureAuthorized(operation.action, operation.resource);

      return resolvedAgent;
    } else if (subset) {
      await resolvedAgent.checkPermissionSubset({ allow: subset });
    }

    return resolvedAgent;
  } catch (error) {
    if (authentication === 'optional') {
      return undefined;
    }
    throw error;
  }
};

const getAuthorization = (method: string, params: IExecuteParams, functionSummary: IFunctionSummary) => {
  let authz = Constants.getFunctionAuthorization(functionSummary);
  let authn = Constants.getFunctionAuthentication(functionSummary);
  const route = (params.matchingRoute = getMatchingRoute(functionSummary, params));

  console.log(`Found route? ${JSON.stringify(route)}`);
  if (route) {
    if (route.security) {
      // Route level security requirements take precedence over function level security requirements
      authn = route.security.authentication;
      authz = route.security.authorization;
    } else if (route.task && method === 'POST') {
      // If a route is a task and request is a task scheduling request and the route does not specify
      // security requirements explicitly, enforce default task security
      authn = 'required';
      authz = [
        {
          action: 'function:schedule',
          resource: `/account/${params.accountId}/subscription/${params.subscriptionId}/boundary/${params.boundaryId}/function/${params.functionId}/`,
        },
      ];
    }
  }

  return { authz, authn };
};

const executeFunction = async (
  params: IExecuteParams,
  method: string,
  options: IExecuteFunctionOptions = { mode: 'request', apiVersion: 'v2' }
): Promise<IExecuteFunction> => {
  /*
   * Should probably be moved into the schema/ side.
  const notBefore = req.headers[Constants.NotBeforeHeader];
  if (notBefore !== undefined) {
    if (isNaN(notBefore) || Date.now() + MaxFusebitTaskNotBeforeRelativeHours * 3600 * 1000 < +notBefore * 1000) {
      return next(
        create_error(
        ))}};
  */

  let sub;
  try {
    sub = await subscriptionCache.find(params.subscriptionId);
  } catch (e) {
    throw create_error(404, 'subscription not found');
  }

  const functionSummary = await loadFunctionSummary(params);

  const { authz: functionAuthz, authn: functionAuthn } = getAuthorization(method, params, functionSummary);

  const functionPerms = Constants.getFunctionPermissions(functionSummary);
  // Guarantee a release regardless of the exceptions that occur later by using a finally{} clause to call
  // the releaseRate function.
  const releaseRate = ratelimit.checkRateLimit(sub, params.subscriptionId);
  try {
    const resolvedAgent = await checkAuthorization(params.accountId, options.token, functionAuthn, functionAuthz);

    // execute
    const physicalBaseUrl = Constants.get_function_location(
      {},
      params.subscriptionId,
      params.boundaryId,
      params.functionId
    );
    const logicalBaseUrl =
      options.apiVersion === 'v1'
        ? physicalBaseUrl
        : `${Constants.get_fusebit_endpoint({})}/${options.apiVersion}/account/${params.accountId}/subscription/${
            params.subscriptionId
          }/${params.boundaryId}/${params.functionId}`;

    const parsedPhysicalUrl = new URL(physicalBaseUrl + params.functionPath);
    const parsedLogicalUrl = new URL(logicalBaseUrl + params.functionPath);

    params = { ...params, baseUrl: physicalBaseUrl, version: Constants.getFunctionVersion(functionSummary) };

    const req: IExecuteRequest = {
      protocol: parsedPhysicalUrl.protocol.replace(':', ''),
      headers: { ...(options.headers || {}), host: parsedPhysicalUrl.host },
      params,
      method,
      body: options.body,
      query: options.query,

      url: parsedPhysicalUrl.pathname.replace(/^\/v1/, ''),
      originalUrl: parsedPhysicalUrl.pathname,
      baseUrl: `/${options.apiVersion}`,

      keyStore,
      resolvedAgent,

      functionSummary,

      startTime: Date.now(),

      ...(options.analytics || {}),
    };

    // Check for task scheduling request
    const taskSchedulingRequest = isTaskSchedulingRequest(req);

    if (!taskSchedulingRequest) {
      params.functionAccessToken = await mintJwtForPermissions(keyStore, params, functionPerms);
      params.logs = await createLoggingCtx(keyStore, params, 'https', Constants.API_PUBLIC_HOST);
    }

    console.log(`Executing: ${req.originalUrl}: task: ${taskSchedulingRequest}`);
    if (options.analytics) {
      // Override the traceIdHeader with the supplied traceId and spanId.  Otherwise, the header contains the
      // value from the "parent" request, which also absorbs the logs and spans that come from this execution.
      req.headers[Constants.traceIdHeader] = `${req.traceId}.${req.spanId}`;
    }

    const res = await asyncDispatch(req, provider_handlers.lambda.execute_function);

    if (options.analytics) {
      dispatch_event({
        requestId: `${req.traceId}.${req.spanId}`,
        traceId: req.traceId,
        parentSpanId: req.parentSpanId,
        spanId: req.spanId,
        startTime: req.startTime,
        endTime: Date.now(),
        metrics: res.metrics,
        request: {
          method: req.method,
          url: parsedLogicalUrl.pathname,
          params: { ...req.params, baseUrl: logicalBaseUrl },
          headers: req.headers,
        },
        response: { statusCode: res.statusCode, headers: res.headers },
        fusebit: {
          ...params,
          modality: 'execution',
          baseUrl: logicalBaseUrl,
          mode: options.mode,
          apiVersion: options.apiVersion,
        },
        error: res.error,
        functionLogs: res.functionLogs,
        functionSpans: res.functionSpans,
        logs: res.logs,
      });
    }

    return {
      body: res.body,
      bodyEncoding: res.bodyEncoding,
      code: res.statusCode,
      error: res.error,
      headers: res.headers,

      // The parent absorbs the logs and spans if this execution doesn't have it's own analytics
      // configuration.
      ...(!options.analytics
        ? {
            functionLogs: res.functionLogs,
            functionSpans: res.functionSpans,
          }
        : { functionLogs: [], functionSpans: [] }),
    };
  } finally {
    releaseRate();
  }
};

export {
  createFunction,
  deleteFunction,
  executeFunction,
  checkAuthorization,
  waitForFunctionBuild,
  IFunctionSpecification,
  IExecuteFunction,
  ICreateFunction,
};
