import { IAccount } from './accountResolver';
import { request, IHttpResponse } from '@5qtrs/request';
import RDS, { Model } from '@5qtrs/db';
import * as querystring from 'querystring';

import { getEnv } from '../v1/setup';

import { getLogs } from '../v1/sdk';

let { function5Id } = getEnv();

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export enum RequestMethod {
  get = 'GET',
  post = 'POST',
  put = 'PUT',
  patch = 'PATCH',
  delete = 'DELETE',
}

export interface IRequestOptions {
  uri?: string;
  method?: RequestMethod;
  maxRedirects?: number;
  contentType?: string;
  body?: string | object;
  headers?: Record<string, string>;
  authz?: string;
  rawUrl?: boolean;
}

export interface IDispatchOptions {
  maxRedirects?: number;
  contentType?: string;
  body?: string | object;
  headers?: Record<string, string>;
  authz?: string;
}

interface IWaitForCompletionParams {
  getAfter: boolean;
  allowFailure: boolean;
  waitMs: number;
  pollMs: number;
}

export const DefaultWaitForCompletionParams: IWaitForCompletionParams = {
  getAfter: true,
  allowFailure: false,
  waitMs: 180000,
  pollMs: 100,
};

const testEntitiesCreated: { entityType: Model.EntityType; id: string }[] = [];
let enableLogAllEntities = false;
const testEntitiesLogged: Record<string, Promise<any>> = {};

export const cleanupEntities = async (account: IAccount) => {
  await (Promise as any).allSettled(
    testEntitiesCreated.map(({ entityType, id }) => (ApiRequestMap as any)[entityType].deleteAndWait(account, id))
  );
  testEntitiesCreated.length = 0; // Clear the array.
  if (enableLogAllEntities) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    for (const entity of Object.keys(testEntitiesLogged)) {
      process.stderr.write(`\n${entity} Logs:\n`);
      for (const m of ((await retrieveLogs(entity)) as any).matchAll(new RegExp(/data: (.*)/g))) {
        process.stderr.write(`\t${m[1]}\n`);
      }
    }
  }

  await new (Promise as any)((res: any) => setTimeout(res, 5000));
};

export const v2Request = async (account: IAccount, options: IRequestOptions) => {
  return request({
    headers: {
      ...(options.authz === ''
        ? {}
        : { Authorization: `Bearer ${options.authz ? options.authz : account.accessToken}` }),
      'user-agent': account.userAgent,
      ...(options.contentType ? { 'content-type': options.contentType } : {}),
      ...(options.headers || {}),
    },
    url: options.rawUrl
      ? (options.uri as string)
      : `${account.baseUrl}/v2/account/${account.accountId}/subscription/${account.subscriptionId}${options.uri}`,
    method: options.method,
    data: options.body,
    maxRedirects: options.maxRedirects,
  });
};

export const waitForCompletion = async (
  account: IAccount,
  entityType: Model.EntityType,
  entityId: string,
  subordinateId?: string,
  waitOpts: Partial<IWaitForCompletionParams> = {},
  options?: IRequestOptions
) => {
  const startTime = Date.now();
  let response: any;

  // Add defaults to waitOptions
  const waitOptions: IWaitForCompletionParams = { ...DefaultWaitForCompletionParams, ...waitOpts };

  do {
    response = subordinateId
      ? await ApiRequestMap[entityType].get(account, entityId, subordinateId, options)
      : await ApiRequestMap[entityType].get(account, entityId, options);
    if (!response.data.operationState || response.data.operationState.status !== Model.OperationStatus.processing) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, waitOptions.pollMs));
  } while (startTime + waitOptions.waitMs > Date.now());

  if (startTime + waitOptions.waitMs < Date.now()) {
    console.log(`WARNING: Failed to complete ${entityId} wait after ${waitOptions.waitMs} ms, aborting wait...`);
    return response;
  }

  if (waitOptions.allowFailure) {
    return response;
  }

  if (!response.data.operationState) {
    return response;
  }

  expect(response).toBeHttp({ statusCode: 200, data: { operationState: { status: Model.OperationStatus.success } } });

  return response;
};

export const waitForCompletionTargetUrl = async (
  account: IAccount,
  targetUrl: string,
  waitOpts: Partial<IWaitForCompletionParams> = {}
) => {
  const startTime = Date.now();
  let response: any;

  // Add defaults to waitOptions
  const waitOptions: IWaitForCompletionParams = { ...DefaultWaitForCompletionParams, ...waitOpts };

  do {
    response = await v2Request(account, {
      uri: targetUrl,
      rawUrl: true,
      method: RequestMethod.get,
    });
    if (!response.data.operationState || response.data.operationState.status !== Model.OperationStatus.processing) {
      return response;
    }
    await new Promise((resolve) => setTimeout(resolve, waitOptions.pollMs));
  } while (startTime + waitOptions.waitMs > Date.now());

  console.log(`WARNING: Failed to wait for ${targetUrl} after ${waitOptions.waitMs} ms, aborting wait...`);

  return response;
};

interface ISdkForEntity {
  get: (account: IAccount, entityId: string, options?: IRequestOptions) => Promise<IHttpResponse>;
  list: (
    account: IAccount,
    query?: {
      tag?: { tagKey: string; tagValue?: string }[];
      count?: number;
      next?: string;
      idPrefix?: string;
      operation?: string;
      state?: Model.EntityState;
      sort?: string;
    },
    options?: IRequestOptions
  ) => Promise<IHttpResponse>;
  post: (
    account: IAccount,
    entityId: string,
    body?: Optional<Model.ISdkEntity, 'id'>,
    options?: IRequestOptions
  ) => Promise<IHttpResponse>;
  postAndWait: (
    account: IAccount,
    entityId: string,
    body: Optional<Model.ISdkEntity, 'id'>,
    waitOptions?: Partial<IWaitForCompletionParams>,
    options?: IRequestOptions
  ) => Promise<IHttpResponse>;
  put: (
    account: IAccount,
    entityId: string,
    body: Model.ISdkEntity,
    options?: IRequestOptions
  ) => Promise<IHttpResponse>;
  putAndWait: (
    account: IAccount,
    entityId: string,
    body: Model.ISdkEntity,
    waitOptions?: Partial<IWaitForCompletionParams>,
    options?: IRequestOptions
  ) => Promise<IHttpResponse>;
  delete: (account: IAccount, entityId: string, options?: IRequestOptions) => Promise<IHttpResponse>;
  deleteAndWait: (
    account: IAccount,
    entityId: string,
    waitOptions?: Partial<IWaitForCompletionParams>,
    options?: IRequestOptions
  ) => Promise<IHttpResponse>;
  dispatch: (
    account: IAccount,
    entityId: string,
    method: RequestMethod,
    path: string,
    options?: IDispatchOptions
  ) => Promise<IHttpResponse>;

  tags: {
    get: (account: IAccount, entityId: string, tagKey?: string, options?: IRequestOptions) => Promise<IHttpResponse>;
    delete: (account: IAccount, entityId: string, tagKey?: string, options?: IRequestOptions) => Promise<IHttpResponse>;
    put: (
      account: IAccount,
      entityId: string,
      tagKey: string,
      tagValue: string,
      options?: IRequestOptions
    ) => Promise<IHttpResponse>;
  };
  session: {
    post: (account: IAccount, entityId: string, body: any, options?: IRequestOptions) => Promise<IHttpResponse>;
    getResult: (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => Promise<any>;
    get: (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => Promise<IHttpResponse>;
    put: (
      account: IAccount,
      entityId: string,
      sessionId: string,
      body: any,
      options?: IRequestOptions
    ) => Promise<IHttpResponse>;
    start: (
      account: IAccount,
      entityId: string,
      sessionId: string,
      options?: IRequestOptions
    ) => Promise<IHttpResponse>;
    callback: (
      account: IAccount,
      entityId: string,
      sessionId: string,
      options?: IRequestOptions
    ) => Promise<IHttpResponse>;
    commitSession: (
      account: IAccount,
      entityId: string,
      sessionId: string,
      options?: Partial<IRequestOptions>
    ) => Promise<IHttpResponse>;
  };
}

const createSdk = (entityType: Model.EntityType): ISdkForEntity => ({
  get: async (account: IAccount, entityId: string, options?: IRequestOptions) => {
    return v2Request(account, { method: RequestMethod.get, uri: `/${entityType}/${encodeURI(entityId)}`, ...options });
  },

  list: async (
    account: IAccount,
    query?: {
      tag?: { tagKey: string; tagValue?: string }[];
      count?: number;
      next?: string;
      idPrefix?: string;
      operation?: string;
      state?: Model.EntityState;
      sort?: string;
    },
    options?: IRequestOptions
  ) => {
    const tagArray = query?.tag?.length
      ? query.tag.reduce<string[]>((acc, cur) => {
          if (cur.tagValue !== undefined) {
            acc.push(`${cur.tagKey}=${cur.tagValue}`);
          } else {
            acc.push(`${cur.tagKey}`);
          }
          return acc;
        }, [])
      : undefined;
    const queryParams: { [key: string]: any } = { ...query, tag: tagArray };
    Object.keys(queryParams).forEach((key) => {
      if (queryParams[key] === undefined) {
        delete queryParams[key];
      }
    });
    return v2Request(account, {
      method: RequestMethod.get,
      uri: `/${entityType}?${querystring.stringify(queryParams)}`,
      ...options,
    });
  },

  post: async (
    account: IAccount,
    entityId: string,
    body?: Optional<Model.ISdkEntity, 'id'>,
    options?: IRequestOptions
  ) => {
    testEntitiesCreated.push({ entityType, id: entityId });
    return v2Request(account, { method: RequestMethod.post, uri: `/${entityType}/${entityId}`, body, ...options });
  },

  postAndWait: async (
    account: IAccount,
    entityId: string,
    body: Optional<Model.ISdkEntity, 'id'>,
    waitOpts: Partial<IWaitForCompletionParams> = {},
    options?: IRequestOptions
  ) => {
    // Add defaults to waitOptions
    const waitOptions: IWaitForCompletionParams = { ...DefaultWaitForCompletionParams, ...waitOpts };

    const op = await ApiRequestMap[entityType].post(account, entityId, body, options);
    expect(op).toBeHttp({
      statusCode: [202, 200],
      data: { operationState: { operation: Model.OperationType.creating, status: Model.OperationStatus.processing } },
    });

    const waitPromise = waitForCompletion(account, entityType, entityId, undefined, waitOptions, options);
    if (!enableLogAllEntities) {
      return waitPromise;
    }

    const result = await waitPromise;

    const logPromise = await attachLogger(account, entityType, entityId);

    return result;
  },

  put: async (account: IAccount, entityId: string, body: Model.ISdkEntity, options?: IRequestOptions) =>
    v2Request(account, { method: RequestMethod.put, uri: `/${entityType}/${encodeURI(entityId)}`, body, ...options }),

  putAndWait: async (
    account: IAccount,
    entityId: string,
    body: Model.ISdkEntity,
    waitOpts: Partial<IWaitForCompletionParams> = {},
    options?: IRequestOptions
  ) => {
    // Add defaults to waitOptions
    const waitOptions: IWaitForCompletionParams = { ...DefaultWaitForCompletionParams, ...waitOpts };

    const op = await ApiRequestMap[entityType].put(account, entityId, body);
    if (op.status !== 200) {
      return op;
    }

    expect(op).toBeHttp({
      statusCode: 200,
      data: { operationState: { operation: Model.OperationType.updating, status: Model.OperationStatus.processing } },
    });

    return waitForCompletion(account, entityType, entityId, undefined, waitOptions, options);
  },

  delete: async (account: IAccount, entityId: string, options?: IRequestOptions) =>
    v2Request(account, { method: RequestMethod.delete, uri: `/${entityType}/${entityId}`, ...options }),

  deleteAndWait: async (
    account: IAccount,
    entityId: string,
    waitOpts: Partial<IWaitForCompletionParams> = {},
    options?: IRequestOptions
  ) => {
    // Add defaults to waitOptions
    const waitOptions: IWaitForCompletionParams = { ...DefaultWaitForCompletionParams, ...waitOpts };

    let wait: any;
    do {
      const op = await ApiRequestMap[entityType].delete(account, entityId);
      if (op.status !== 204) {
        return op;
      }
      wait = waitForCompletion(account, entityType, entityId, undefined, waitOptions, options);
    } while (wait.status === 429);

    return wait;
  },

  dispatch: async (
    account: IAccount,
    entityId: string,
    method: RequestMethod,
    path: string,
    options?: IDispatchOptions
  ) => v2Request(account, { method, uri: `/${entityType}/${entityId}${path}`, ...options }),

  tags: {
    get: async (account: IAccount, entityId: string, tagKey: string = '', options?: IRequestOptions) =>
      v2Request(account, { method: RequestMethod.get, uri: `/${entityType}/${entityId}/tag/${tagKey}`, ...options }),

    delete: async (account: IAccount, entityId: string, tagKey: string = '', options?: IRequestOptions) =>
      v2Request(account, { method: RequestMethod.delete, uri: `/${entityType}/${entityId}/tag/${tagKey}`, ...options }),

    put: async (account: IAccount, entityId: string, tagKey: string, tagValue: string, options?: IRequestOptions) =>
      v2Request(account, {
        method: RequestMethod.put,
        uri: `/${entityType}/${entityId}/tag/${tagKey}/${tagValue}`,
        ...options,
      }),
  },
  session: {
    post: async (
      account: IAccount,
      entityId: string,
      body: Model.ISessionParameters | Model.IStep,
      options?: IRequestOptions
    ) => {
      const response = await v2Request(account, {
        method: RequestMethod.post,
        uri: `/${entityType}/${encodeURI(entityId)}/session/`,
        body,
        ...options,
      });
      if (response.status < 300) {
        expect(response.data.id).not.toMatch('/');
        expect(response.data.targetUrl).toMatch(
          `/v2/account/${account.accountId}/subscription/${account.subscriptionId}/${entityType}/${encodeURI(
            entityId
          )}/session/${response.data.id}/start`
        );
      }

      return response;
    },
    getResult: async (account: IAccount, entityId: string, sessionId: string) => {
      return RDS.DAO.session.getEntity({
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        id: Model.createSubordinateId(entityType, entityId, sessionId),
      });
    },
    get: async (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => {
      const response = await v2Request(account, {
        method: RequestMethod.get,
        uri: `/${entityType}/${encodeURI(entityId)}/session/${sessionId}`,
        ...options,
      });
      if (response.status < 300) {
        expect(response.data.id).not.toMatch('/');
      }
      return response;
    },
    put: async (account: IAccount, entityId: string, sessionId: string, body: any, options?: IRequestOptions) => {
      const response = await v2Request(account, {
        method: RequestMethod.put,
        uri: `/${entityType}/${encodeURI(entityId)}/session/${sessionId}`,
        body,
        ...options,
      });
      if (response.status < 300) {
        expect(response.data.id).not.toMatch('/');
      }
      return response;
    },
    start: async (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => {
      return v2Request(account, {
        method: RequestMethod.get,
        uri: `/${entityType}/${encodeURI(entityId)}/session/${sessionId}/start`,
        maxRedirects: 0,
        ...options,
      });
    },
    callback: async (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => {
      return v2Request(account, {
        method: RequestMethod.get,
        uri: `/${entityType}/${encodeURI(entityId)}/session/${sessionId}/callback`,
        maxRedirects: 0,
        ...options,
      });
    },
    commitSession: async (account: IAccount, entityId: string, sessionId: string, options?: Partial<IRequestOptions>) =>
      v2Request(account, {
        method: RequestMethod.post,
        uri: `/${entityType}/${encodeURI(entityId)}/session/${sessionId}/commit`,
        ...options,
      }),
  },
});

export const ApiRequestMap: {
  connector: ISdkForEntity & {
    fanOut: (account: IAccount, entityId: string, path: string, options?: IDispatchOptions) => Promise<IHttpResponse>;
  };
  integration: ISdkForEntity;
  install: any;
  identity: any;
  [key: string]: any;
} = {
  connector: {
    ...createSdk(Model.EntityType.connector),
    fanOut: async (account: IAccount, entityId: string, path: string, options?: IDispatchOptions) =>
      v2Request(account, { method: RequestMethod.post, uri: `/connector/${entityId}/fan_out/${path}`, ...options }),
  },
  integration: createSdk(Model.EntityType.integration),
  install: {
    get: async (account: IAccount, entityId: string, subordinateId: string, options?: IRequestOptions) => {
      const response = await v2Request(account, {
        method: RequestMethod.get,
        uri: `/integration/${encodeURI(entityId)}/install/${subordinateId}`,
        ...options,
      });
      if (response.status < 300) {
        expect(response.data.id).not.toMatch('/');
      }
      return response;
    },

    delete: async (account: IAccount, entityId: string, subordinateId: string, options?: IRequestOptions) => {
      const response = await v2Request(account, {
        method: RequestMethod.delete,
        uri: `/integration/${encodeURI(entityId)}/install/${subordinateId}`,
        ...options,
      });
      return response;
    },

    post: async (
      account: IAccount,
      entityId: string,
      body: {
        tags?: Model.ITags;
        data?: any;
        expires?: string;
        version?: string;
      },
      options?: IRequestOptions
    ) => {
      const response = await v2Request(account, {
        method: RequestMethod.post,
        uri: `/integration/${encodeURI(entityId)}/install/`,
        body,
        ...options,
      });
      return response;
    },

    put: async (
      account: IAccount,
      entityId: string,
      subEntityId: string,
      body: {
        tags?: Model.ITags;
        data?: any;
        expires?: string;
        version?: string;
      },
      options?: IRequestOptions
    ) => {
      const response = await v2Request(account, {
        method: RequestMethod.put,
        uri: `/integration/${encodeURI(entityId)}/install/${subEntityId}`,
        body,
        ...options,
      });
      return response;
    },

    list: async (
      account: IAccount,
      entityId: string,
      query?: {
        tag?: { tagKey: string; tagValue?: string }[];
        count?: number;
        next?: string;
        idPrefix?: string;
        operation?: string;
      },
      options?: IRequestOptions
    ) => {
      const tagArray = query?.tag?.length
        ? query.tag.reduce<string[]>((acc, cur) => {
            if (cur.tagValue !== undefined) {
              acc.push(`${cur.tagKey}=${cur.tagValue}`);
            } else {
              acc.push(`${cur.tagKey}`);
            }
            return acc;
          }, [])
        : undefined;
      const queryParams: { [key: string]: any } = { ...query, tag: tagArray };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      return v2Request(account, {
        method: RequestMethod.get,
        uri: `/integration/${entityId}/install/?${querystring.stringify(queryParams)}`,
        ...options,
      });
    },

    search: async (
      account: IAccount,
      query?: {
        tag?: { tagKey: string; tagValue?: string }[];
        count?: number;
        next?: string;
      },
      options?: IRequestOptions
    ) => {
      const tagArray = query?.tag?.length
        ? query.tag.reduce<string[]>((acc, cur) => {
            if (cur.tagValue !== undefined) {
              acc.push(`${cur.tagKey}=${cur.tagValue}`);
            } else {
              acc.push(`${cur.tagKey}`);
            }
            return acc;
          }, [])
        : undefined;
      const queryParams: { [key: string]: any } = { ...query, tag: tagArray };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      return v2Request(account, {
        method: RequestMethod.get,
        uri: `/install/?${querystring.stringify(queryParams)}`,
        ...options,
      });
    },
  },
  identity: {
    get: async (account: IAccount, entityId: string, subordinateId: string, options?: IRequestOptions) => {
      const response = await v2Request(account, {
        method: RequestMethod.get,
        uri: `/connector/${encodeURI(entityId)}/identity/${subordinateId}`,
        ...options,
      });
      if (response.status < 300) {
        expect(response.data.id).not.toMatch('/');
      }
      return response;
    },

    delete: async (account: IAccount, entityId: string, subordinateId: string, options?: IRequestOptions) => {
      const response = await v2Request(account, {
        method: RequestMethod.delete,
        uri: `/connector/${encodeURI(entityId)}/identity/${subordinateId}`,
        ...options,
      });
      return response;
    },

    post: async (
      account: IAccount,
      entityId: string,
      body: {
        tags?: Model.ITags;
        data?: any;
        expires?: string;
        version?: string;
      },
      options?: IRequestOptions
    ) => {
      const response = await v2Request(account, {
        method: RequestMethod.post,
        uri: `/connector/${encodeURI(entityId)}/identity/`,
        body,
        ...options,
      });
      return response;
    },

    put: async (
      account: IAccount,
      entityId: string,
      subEntityId: string,
      body: {
        tags?: Model.ITags;
        data?: any;
        expires?: string;
        version?: string;
      },
      options?: IRequestOptions
    ) => {
      const response = await v2Request(account, {
        method: RequestMethod.put,
        uri: `/connector/${encodeURI(entityId)}/identity/${subEntityId}`,
        body,
        ...options,
      });
      return response;
    },

    list: async (
      account: IAccount,
      entityId: string,
      query?: {
        tag?: { tagKey: string; tagValue?: string }[];
        count?: number;
        next?: string;
        idPrefix?: string;
        operation?: string;
        sort?: string;
      },
      options?: IRequestOptions
    ) => {
      const tagArray = query?.tag?.length
        ? query.tag.reduce<string[]>((acc, cur) => {
            if (cur.tagValue !== undefined) {
              acc.push(`${cur.tagKey}=${cur.tagValue}`);
            } else {
              acc.push(`${cur.tagKey}`);
            }
            return acc;
          }, [])
        : undefined;
      const queryParams: { [key: string]: any } = { ...query, tag: tagArray };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      return v2Request(account, {
        method: RequestMethod.get,
        uri: `/connector/${entityId}/identity/?${querystring.stringify(queryParams)}`,
        ...options,
      });
    },

    search: async (
      account: IAccount,
      query?: {
        tag?: { tagKey: string; tagValue?: string }[];
        count?: number;
        next?: string;
        sort?: string;
      },
      options?: IRequestOptions
    ) => {
      const tagArray = query?.tag?.length
        ? query.tag.reduce<string[]>((acc, cur) => {
            if (cur.tagValue !== undefined) {
              acc.push(`${cur.tagKey}=${cur.tagValue}`);
            } else {
              acc.push(`${cur.tagKey}`);
            }
            return acc;
          }, [])
        : undefined;
      const queryParams: { [key: string]: any } = { ...query, tag: tagArray };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      return v2Request(account, {
        method: RequestMethod.get,
        uri: `/identity/?${querystring.stringify(queryParams)}`,
        ...options,
      });
    },
  },
};

export const createPair = async (
  account: IAccount,
  boundaryId: string,
  integConfig?: {
    files?: Record<string, string>;
    encodedFiles?: Record<string, { data: string; encoding: string }>;
    handler?: string;
    configuration?: Record<string, any>;
    componentTags?: Record<string, string>;
    components?: Model.IIntegrationComponent[];
    security?: { permissions: Model.IEntityPermission[] };
  },
  connConfig?: {
    files?: Record<string, string>;
    handler?: string;
    configuration?: {
      muxIntegration?: Model.IEntityId;
      [key: string]: any;
    };
    componentTags?: Record<string, string>;
    security?: { permissions: Model.IEntityPermission[] };
  },
  numConnectors: number = 1
) => {
  const integId = `${boundaryId}-integ`;
  const connName = 'conn';
  const conId = `${boundaryId}-con`;

  const conns: any = {};
  const components: Model.IIntegrationComponent[] = [
    {
      name: connName,
      entityType: Model.EntityType.connector,
      entityId: conId,
      dependsOn: [] as string[],
      provider: '@fusebit-int/oauth-provider',
    },
  ];

  for (let n = 1; n < numConnectors; n++) {
    conns[`${connName}${n}`] = { provider: '@fusebit-int/oauth-provider', connector: `${conId}${n}` };
    components.push({
      name: `${connName}${n}`,
      entityType: Model.EntityType.connector,
      entityId: `${conId}${n}`,
      provider: '@fusebit-int/oauth-provider',
      dependsOn: [],
      ...(n > 1 ? { dependsOn: [`${connName}${n - 1}`] } : {}),
    });
  }

  const integEntity: { id: string; data: Model.IIntegrationData } = {
    id: integId,
    data: {
      components,
      componentTags: {},
      configuration: {},

      handler: './integration',
      files: {
        'integration.js': [
          "const { Integration } = require('@fusebit-int/framework');",
          '',
          'const integration = new Integration();',
          'const router = integration.router;',
          "router.get('/api/', async (ctx) => { });",
          "router.get('/api/token/', async (ctx) => { ctx.body = ctx.state.params.functionAccessToken; });",
          'module.exports = integration;',
        ].join('\n'),
      },

      ...integConfig,
    },
  };

  let response = await ApiRequestMap.integration.postAndWait(account, integId, integEntity);
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.id).not.toMatch('/');
  const integ = response.data;

  response = await ApiRequestMap.integration.dispatch(account, response.data.id, RequestMethod.get, '/api/health');
  expect(response).toBeHttp({ statusCode: 200 });

  response = await ApiRequestMap.connector.postAndWait(account, conId, { id: conId, data: connConfig });
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.id).not.toMatch('/');
  const conn = response.data;

  response = await ApiRequestMap.connector.dispatch(account, response.data.id, RequestMethod.get, '/api/health');
  expect(response).toBeHttp({ statusCode: 200 });

  for (let n = 1; n < numConnectors; n++) {
    response = await ApiRequestMap.connector.postAndWait(account, `${conId}${n}`, {
      id: `${conId}${n}`,
      data: connConfig,
    });
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.connector.dispatch(account, response.data.id, RequestMethod.get, '/api/health');
    expect(response).toBeHttp({ statusCode: 200 });
  }

  return {
    connectorId: conn.id,
    integrationId: integ.id,
    steps: integEntity.data.components.map((comp: Model.IIntegrationComponent) => comp.name),
    connectorIds: integEntity.data.components.map((comp: Model.IIntegrationComponent) => comp.entityId),
  };
};

export const getElementsFromUrl = (url: string) => {
  const decomp = new URL(url);
  const comps = decomp.pathname.match(new RegExp('/v2/account/([^/]*)/subscription/([^/]*)/([^/]*)/([^/]*).*'));

  if (!comps) {
    throw new Error(`invalid url: ${decomp.pathname}`);
  }

  return {
    accountId: comps[1],
    subscriptionId: comps[2],
    entityType: comps[3],
    entityId: comps[4],
    sessionId: decomp.searchParams.get('session'),
  };
};

export const getEntityLogs = async (entityType: Model.EntityType, entityId: string): Promise<string> => {
  return retrieveLogs(`${entityType}/${entityId}`);
};

const retrieveLogs = async (logKey: string): Promise<string> => {
  const logResponse = await testEntitiesLogged[logKey];
  delete testEntitiesLogged[logKey];

  expect(logResponse).toBeHttp({ statusCode: 200 });
  expect(logResponse.headers['content-type']).toMatch(/text\/event-stream/);

  return logResponse.data;
};

export const enableLogs = (mode: boolean = true) => {
  enableLogAllEntities = mode;
};

export const attachLogger = async (account: IAccount, entityType: Model.EntityType, entityId: string) => {
  const logsPromise = getLogs(account, entityType, entityId);

  // Real time logs can take up to 5s to become effective
  await new Promise((resolve) => setTimeout(resolve, 6000));

  testEntitiesLogged[`${entityType}/${entityId}`] = logsPromise;
  return { logsPromise };
};

export const createTestFile = (getTestFile: () => any, replacements: Record<string, string> = {}): string => {
  let stringFunc = String(getTestFile);
  let stringArray = stringFunc.split('}');
  stringArray.pop();
  stringFunc = stringArray.join('}');
  stringArray = stringFunc.split('{');
  stringArray.shift();
  stringFunc = stringArray.join('{');
  Object.entries(replacements).forEach(([find, replace]) => {
    stringFunc = stringFunc.replace(new RegExp(find, 'g'), replace);
  });
  return stringFunc;
};

export const usFromTs = (ts: string) =>
  (Math.trunc(new Date(ts).getTime() / 1000) * 1000 + Number(`.${ts.split('.')[1]}`) * 1000) * 1000;
