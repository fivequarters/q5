import create_error from 'http-errors';

import { AwsKeyStore, loadFunctionSummary, mintJwtForPermissions } from '@5qtrs/runas';
import { IRegistryStore } from '@5qtrs/registry';
import { IAgent } from '@5qtrs/account-data';
import * as Constants from '@5qtrs/constants';
import { createLoggingCtx } from '@5qtrs/runtime-common';

import * as provider_handlers from './handlers/provider_handlers';
import * as ratelimit from './middleware/ratelimit';

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

const asyncDispatch = async (req: any, handler: any) => {
  let res;
  await new Promise((resolve, reject) => {
    res = {
      code: undefined,
      body: undefined,
      bodyEncoding: undefined,
      headers: {},
      json(val: any) {
        this.code = this.code || 200;
        this.body = val;
        resolve();
      },
      status(status: number) {
        this.code = status;
      },
      set(key: string, value: string) {
        this.headers[key] = value;
      },
      end(body?: string, bodyEncoding?: string) {
        if (!body) {
          return resolve();
        }
        this.body = body;
        this.bodyEncoding = bodyEncoding;
        return resolve();
      },
    };
    handler(req, res, reject);
  });
  return res;
};

const createFunction = async (
  params: IParams,
  spec: IFunctionSpecification,
  keyStore: AwsKeyStore,
  resolvedAgent: IAgent,
  registry: IRegistryStore
) => {
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

const deleteFunction = async (params: IParams) => {
  return asyncDispatch({ params }, provider_handlers.lambda.delete_function);
};

const executeFunction = async (
  params: IParams,
  keyStore: AwsKeyStore,
  resolvedAgent: any,
  loggingHost: string,
  subscriptionCache: any,
  method: string,
  url: string,
  body?: any,
  headers: any = {},
  query: any = {}
) => {
  let sub;
  try {
    sub = await subscriptionCache.find(params.subscriptionId);
  } catch (e) {
    throw create_error(404, 'subscription not found');
  }

  // Guaranteee a release regardless of the exceptions that occur later by using a finally{} clause to call
  // the releaseRate function.
  const releaseRate = ratelimit.checkRateLimit(sub, params.subscriptionId);

  try {
    const functionSummary = await loadFunctionSummary(params);
    const functionAuthz = Constants.getFunctionAuthorization(functionSummary);
    const functionPerms = Constants.getFunctionPermissions(functionSummary);
    await resolvedAgent.checkPermissionSubset({ allow: functionAuthz });
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
    return await asyncDispatch(req, provider_handlers.lambda.invoket_function);
  } finally {
    releaseRate();
  }
};

export { createFunction, deleteFunction, executeFunction };
