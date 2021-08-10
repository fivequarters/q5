import { IAccount } from './accountResolver';
import { request } from '@5qtrs/request';
import { Model } from '@5qtrs/db';
import * as querystring from 'querystring';

import { getEnv } from '../v1/setup';

let { function5Id } = getEnv();

export interface IRequestOptions {
  uri: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  maxRedirects?: number;
  contentType?: string;
  body?: string | object;
  authz?: string;
}

export interface IDispatchOptions {
  maxRedirects?: number;
  contentType?: string;
  body?: string | object;
  authz?: string;
}

interface IWaitForCompletionParams {
  getAfter: boolean;
  waitMs: number;
  pollMs: number;
}

const DefaultWaitForCompletionParams: IWaitForCompletionParams = {
  getAfter: true,
  waitMs: 30000,
  pollMs: 100,
};

const testEntitiesCreated: { entityType: Model.EntityType; id: string }[] = [];

export const cleanupEntities = async (account: IAccount) => {
  await (Promise as any).allSettled(
    testEntitiesCreated.map(({ entityType, id }) => (ApiRequestMap as any)[entityType].deleteAndWait(account, id))
  );
  testEntitiesCreated.length = 0; // Clear the array.
};

export const v2Request = async (account: IAccount, options: IRequestOptions) => {
  return request({
    headers: {
      ...(options.authz === ''
        ? {}
        : { Authorization: `Bearer ${options.authz ? options.authz : account.accessToken}` }),
      'user-agent': account.userAgent,
      ...(options.contentType ? { 'content-type': options.contentType } : {}),
    },
    url: `${account.baseUrl}/v2/account/${account.accountId}/subscription/${account.subscriptionId}${options.uri}`,
    method: options.method,
    data: options.body,
    maxRedirects: options.maxRedirects,
  });
};

export const ApiRequestMap: { [key: string]: any } = {
  connector: {
    session: {
      post: async (
        account: IAccount,
        entityId: string,
        body: Model.ISessionParameters | Model.IStep,
        options?: IRequestOptions
      ) => {
        const response = await v2Request(account, {
          method: 'POST',
          uri: `/connector/${encodeURI(entityId)}/session/`,
          body,
          ...options,
        });
        if (response.status < 300) {
          expect(response.data.id).not.toMatch('/');
        }
        return response;
      },
      getResult: async (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => {
        const response = await v2Request(account, {
          method: 'GET',
          uri: `/connector/${encodeURI(entityId)}/session/${sessionId}/result`,
          ...options,
        });
        if (response.status < 300) {
          expect(response.data.id).not.toMatch('/');
        }
        return response;
      },
      get: async (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => {
        const response = await v2Request(account, {
          method: 'GET',
          uri: `/connector/${encodeURI(entityId)}/session/${sessionId}`,
          ...options,
        });
        if (response.status < 300) {
          expect(response.data.id).not.toMatch('/');
        }
        return response;
      },
      put: async (account: IAccount, entityId: string, sessionId: string, body: any, options?: IRequestOptions) => {
        const response = await v2Request(account, {
          method: 'PUT',
          uri: `/connector/${encodeURI(entityId)}/session/${sessionId}`,
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
          method: 'GET',
          uri: `/connector/${encodeURI(entityId)}/session/${sessionId}/start`,
          maxRedirects: 0,
          ...options,
        });
      },
      callback: async (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => {
        return v2Request(account, {
          method: 'GET',
          uri: `/connector/${encodeURI(entityId)}/session/${sessionId}/callback`,
          maxRedirects: 0,
          ...options,
        });
      },
    },
    get: async (account: IAccount, connectorId: string, options?: IRequestOptions) => {
      return v2Request(account, { method: 'GET', uri: `/connector/${encodeURI(connectorId)}`, ...options });
    },

    list: async (
      account: IAccount,
      query?: { tag?: { tagKey: string; tagValue?: string }; limit?: number; next?: string; idPrefix?: string },
      options?: IRequestOptions
    ) => {
      const tagString = query?.tag?.tagValue ? `${query.tag.tagKey}=${query.tag.tagValue}` : query?.tag?.tagKey;
      const queryParams: { [key: string]: any } = { ...query, tag: tagString };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      return v2Request(account, { method: 'GET', uri: `/connector?${querystring.stringify(queryParams)}`, ...options });
    },

    post: async (account: IAccount, body: Model.ISdkEntity, options?: IRequestOptions) => {
      testEntitiesCreated.push({ entityType: Model.EntityType.connector, id: body.id });
      return v2Request(account, { method: 'POST', uri: '/connector', body, ...options });
    },

    postAndWait: async (
      account: IAccount,
      body: Model.ISdkEntity,
      waitOptions: IWaitForCompletionParams = DefaultWaitForCompletionParams,
      options?: IRequestOptions
    ) => {
      const op = await ApiRequestMap.connector.post(account, body);
      expect(op).toBeHttp({ statusCode: 202 });
      return ApiRequestMap.operation.waitForCompletion(account, op.data.operationId, waitOptions, options);
    },

    put: async (account: IAccount, connectorId: string, body: Model.ISdkEntity, options?: IRequestOptions) =>
      v2Request(account, { method: 'PUT', uri: `/connector/${encodeURI(connectorId)}`, body, ...options }),

    putAndWait: async (
      account: IAccount,
      connectorId: string,
      body: Model.ISdkEntity,
      waitOptions: IWaitForCompletionParams = DefaultWaitForCompletionParams,
      options?: IRequestOptions
    ) => {
      const op = await ApiRequestMap.connector.put(account, connectorId, body);
      expect(op).toBeHttp({ statusCode: 202 });
      return ApiRequestMap.operation.waitForCompletion(account, op.data.operationId, waitOptions, options);
    },

    delete: async (account: IAccount, connectorId: string, options?: IRequestOptions) =>
      v2Request(account, { method: 'DELETE', uri: `/connector/${connectorId}`, ...options }),

    deleteAndWait: async (
      account: IAccount,
      entityId: string,
      waitOptions: IWaitForCompletionParams = DefaultWaitForCompletionParams,
      options?: IRequestOptions
    ) => {
      let wait: any;
      do {
        const op = await ApiRequestMap.connector.delete(account, entityId);
        expect(op).toBeHttp({ statusCode: 202 });
        wait = await ApiRequestMap.operation.waitForCompletion(
          account,
          op.data.operationId,
          { ...waitOptions, getAfter: false },
          options
        );
      } while (wait.status === 428);

      return wait;
    },

    dispatch: async (
      account: IAccount,
      entityId: string,
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      path: string,
      options: IDispatchOptions
    ) => v2Request(account, { method, uri: `/connector/${entityId}${path}`, ...options }),

    tags: {
      get: async (account: IAccount, connectorId: string, tagKey: string = '', options?: IRequestOptions) =>
        v2Request(account, { method: 'GET', uri: `/connector/${connectorId}/tag/${tagKey}`, ...options }),

      delete: async (account: IAccount, connectorId: string, tagKey: string = '', options?: IRequestOptions) =>
        v2Request(account, { method: 'DELETE', uri: `/connector/${connectorId}/tag/${tagKey}`, ...options }),

      put: async (
        account: IAccount,
        connectorId: string,
        tagKey: string,
        tagValue: string,
        options?: IRequestOptions
      ) =>
        v2Request(account, { method: 'PUT', uri: `/connector/${connectorId}/tag/${tagKey}/${tagValue}`, ...options }),
    },
  },
  integration: {
    session: {
      post: async (
        account: IAccount,
        entityId: string,
        body: Model.ISessionParameters | Model.IStep,
        options?: IRequestOptions
      ) => {
        const response = await v2Request(account, {
          method: 'POST',
          uri: `/integration/${encodeURI(entityId)}/session/`,
          body,
          ...options,
        });
        if (response.status < 300) {
          expect(response.data.id).not.toMatch('/');
        }
        return response;
      },
      getResult: async (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => {
        const response = await v2Request(account, {
          method: 'GET',
          uri: `/integration/${encodeURI(entityId)}/session/${sessionId}/result`,
          ...options,
        });
        if (response.status < 300) {
          expect(response.data.id).not.toMatch('/');
        }
        return response;
      },
      get: async (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => {
        const response = await v2Request(account, {
          method: 'GET',
          uri: `/integration/${encodeURI(entityId)}/session/${sessionId}`,
          ...options,
        });
        if (response.status < 300) {
          expect(response.data.id).not.toMatch('/');
        }
        return response;
      },
      put: async (account: IAccount, entityId: string, sessionId: string, body: any, options?: IRequestOptions) => {
        const response = await v2Request(account, {
          method: 'PUT',
          uri: `/integration/${encodeURI(entityId)}/session/${sessionId}`,
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
          method: 'GET',
          uri: `/integration/${encodeURI(entityId)}/session/${sessionId}/start`,
          maxRedirects: 0,
          ...options,
        });
      },
      callback: async (account: IAccount, entityId: string, sessionId: string, options?: IRequestOptions) => {
        return v2Request(account, {
          method: 'GET',
          uri: `/integration/${encodeURI(entityId)}/session/${sessionId}/callback`,
          maxRedirects: 0,
          ...options,
        });
      },
      postSession: async (
        account: IAccount,
        entityId: string,
        sessionId: string,
        waitOptions: IWaitForCompletionParams = DefaultWaitForCompletionParams,
        options?: IRequestOptions
      ) => {
        const op = await v2Request(account, {
          method: 'POST',
          uri: `/integration/${encodeURI(entityId)}/session/${sessionId}`,
          ...options,
        });
        expect(op).toBeHttp({ statusCode: 202 });
        return ApiRequestMap.operation.waitForCompletion(
          account,
          op.data.operationId,
          { ...waitOptions, getAfter: false },
          options
        );
      },
    },

    get: async (account: IAccount, integrationId: string, options?: IRequestOptions) => {
      return v2Request(account, { method: 'GET', uri: `/integration/${encodeURI(integrationId)}`, ...options });
    },

    list: async (
      account: IAccount,
      query?: { tag?: { tagKey: string; tagValue?: string }; limit?: number; next?: string; idPrefix?: string },
      options?: IRequestOptions
    ) => {
      const tagString = query?.tag?.tagValue ? `${query.tag.tagKey}=${query.tag.tagValue}` : query?.tag?.tagKey;
      const queryParams: { [key: string]: any } = { ...query, tag: tagString };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      return v2Request(account, {
        method: 'GET',
        uri: `/integration?${querystring.stringify(queryParams)}`,
        ...options,
      });
    },

    post: async (account: IAccount, body: Model.ISdkEntity, options?: IRequestOptions) => {
      testEntitiesCreated.push({ entityType: Model.EntityType.integration, id: body.id });
      return v2Request(account, { method: 'POST', uri: '/integration', body, ...options });
    },

    postAndWait: async (
      account: IAccount,
      body: Model.ISdkEntity,
      waitOptions: IWaitForCompletionParams = DefaultWaitForCompletionParams,
      options?: IRequestOptions
    ) => {
      const op = await ApiRequestMap.integration.post(account, body);
      expect(op).toBeHttp({ statusCode: 202 });
      return ApiRequestMap.operation.waitForCompletion(account, op.data.operationId, waitOptions, options);
    },

    put: async (account: IAccount, integrationId: string, body: Model.ISdkEntity, options?: IRequestOptions) =>
      v2Request(account, { method: 'PUT', uri: `/integration/${encodeURI(integrationId)}`, body, ...options }),
    putAndWait: async (
      account: IAccount,
      integrationId: string,
      body: Model.ISdkEntity,
      waitOptions: IWaitForCompletionParams = DefaultWaitForCompletionParams,
      options?: IRequestOptions
    ) => {
      const op = await ApiRequestMap.integration.put(account, integrationId, body);
      expect(op).toBeHttp({ statusCode: 202 });
      return ApiRequestMap.operation.waitForCompletion(account, op.data.operationId, waitOptions, options);
    },

    delete: async (account: IAccount, integrationId: string, options?: IRequestOptions) =>
      v2Request(account, { method: 'DELETE', uri: `/integration/${integrationId}`, ...options }),

    deleteAndWait: async (
      account: IAccount,
      entityId: string,
      waitOptions: IWaitForCompletionParams = DefaultWaitForCompletionParams,
      options?: IRequestOptions
    ) => {
      const op = await ApiRequestMap.integration.delete(account, entityId);
      expect(op).toBeHttp({ statusCode: 202 });
      return ApiRequestMap.operation.waitForCompletion(
        account,
        op.data.operationId,
        { ...waitOptions, getAfter: false },
        options
      );
    },

    dispatch: async (
      account: IAccount,
      entityId: string,
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      path: string,
      options: IDispatchOptions
    ) => v2Request(account, { method, uri: `/integration/${entityId}${path}`, ...options }),

    tags: {
      get: async (account: IAccount, integrationId: string, tagKey: string = '', options?: IRequestOptions) =>
        v2Request(account, { method: 'GET', uri: `/integration/${integrationId}/tag/${tagKey}`, ...options }),

      delete: async (account: IAccount, integrationId: string, tagKey: string = '', options?: IRequestOptions) =>
        v2Request(account, { method: 'DELETE', uri: `/integration/${integrationId}/tag/${tagKey}`, ...options }),

      put: async (
        account: IAccount,
        integrationId: string,
        tagKey: string,
        tagValue: string,
        options?: IRequestOptions
      ) =>
        v2Request(account, {
          method: 'PUT',
          uri: `/integration/${integrationId}/tag/${tagKey}/${tagValue}`,
          ...options,
        }),
    },
  },
  operation: {
    get: async (account: IAccount, operationId: string, options?: IRequestOptions) => {
      return v2Request(account, { method: 'GET', uri: `/operation/${encodeURI(operationId)}`, ...options });
    },

    waitForCompletion: async (
      account: IAccount,
      operationId: string,
      waitOptions: IWaitForCompletionParams = DefaultWaitForCompletionParams,
      options?: IRequestOptions
    ) => {
      const startTime = Date.now();
      let response: any;
      waitOptions = { ...DefaultWaitForCompletionParams, ...waitOptions };
      do {
        response = await ApiRequestMap.operation.get(account, operationId, options);
        if (response.status === 200) {
          if (waitOptions.getAfter) {
            response = await ApiRequestMap[response.data.location.entityType].get(
              account,
              response.data.location.entityId,
              options
            );
          }
          break;
        }
        if (response.status !== 202) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, waitOptions.pollMs));
      } while (startTime + waitOptions.waitMs > Date.now());
      return response;
    },
  },
  instance: {
    get: async (account: IAccount, entityId: string, subordinateId: string, options?: IRequestOptions) => {
      const response = await v2Request(account, {
        method: 'GET',
        uri: `/integration/${encodeURI(entityId)}/instance/${subordinateId}`,
        ...options,
      });
      if (response.status < 300) {
        expect(response.data.id).not.toMatch('/');
      }
      return response;
    },
    delete: async (account: IAccount, entityId: string, subordinateId: string, options?: IRequestOptions) => {
      const response = await v2Request(account, {
        method: 'DELETE',
        uri: `/integration/${encodeURI(entityId)}/instance/${subordinateId}`,
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
        method: 'POST',
        uri: `/integration/${encodeURI(entityId)}/instance/`,
        body,
        ...options,
      });
      return response;
    },
    list: async (
      account: IAccount,
      entityId: string,
      query?: { tag?: { tagKey: string; tagValue?: string }; limit?: number; next?: string; idPrefix?: string },
      options?: IRequestOptions
    ) => {
      const tagString = query?.tag?.tagValue ? `${query.tag.tagKey}=${query.tag.tagValue}` : query?.tag?.tagKey;
      const queryParams: { [key: string]: any } = { ...query, tag: tagString };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      return v2Request(account, {
        method: 'GET',
        uri: `/integration/${entityId}/instance/?${querystring.stringify(queryParams)}`,
        ...options,
      });
    },
  },
  identity: {
    get: async (account: IAccount, entityId: string, subordinateId: string, options?: IRequestOptions) => {
      const response = await v2Request(account, {
        method: 'GET',
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
        method: 'DELETE',
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
        method: 'POST',
        uri: `/connector/${encodeURI(entityId)}/identity/`,
        body,
        ...options,
      });
      return response;
    },
    list: async (
      account: IAccount,
      entityId: string,
      query?: { tag?: { tagKey: string; tagValue?: string }; limit?: number; next?: string; idPrefix?: string },
      options?: IRequestOptions
    ) => {
      const tagString = query?.tag?.tagValue ? `${query.tag.tagKey}=${query.tag.tagValue}` : query?.tag?.tagKey;
      const queryParams: { [key: string]: any } = { ...query, tag: tagString };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      return v2Request(account, {
        method: 'GET',
        uri: `/connector/${entityId}/identity/?${querystring.stringify(queryParams)}`,
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
    handler?: string;
    configuration?: Record<string, any>;
    componentTags?: Record<string, string>;
    components?: Model.IIntegrationComponent[];
  },
  connConfig?: {
    handler?: string;
    configuration?: {
      muxIntegration?: Model.IEntityId;
      [key: string]: any;
    };
    componentTags?: Record<string, string>;
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
        ['integration.js']: [
          "const { Integration } = require('@fusebit-int/framework');",
          '',
          'const integration = new Integration();',
          'const router = integration.router;',
          "router.get('/api/', async (ctx) => { });",
          'module.exports = integration;',
        ].join('\n'),
      },

      ...integConfig,
    },
  };

  let response = await ApiRequestMap.integration.postAndWait(account, integEntity);
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.id).not.toMatch('/');
  const integ = response.data;

  response = await ApiRequestMap.integration.dispatch(account, response.data.id, 'GET', '/api/health');
  expect(response).toBeHttp({ statusCode: 200 });

  response = await ApiRequestMap.connector.postAndWait(account, { id: conId, data: connConfig });
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.id).not.toMatch('/');
  const conn = response.data;

  response = await ApiRequestMap.connector.dispatch(account, response.data.id, 'GET', '/api/health');
  expect(response).toBeHttp({ statusCode: 200 });

  for (let n = 1; n < numConnectors; n++) {
    response = await ApiRequestMap.connector.postAndWait(account, { id: `${conId}${n}`, data: connConfig });
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.connector.dispatch(account, response.data.id, 'GET', '/api/health');
    expect(response).toBeHttp({ statusCode: 200 });
  }

  return {
    connectorId: conn.id,
    integrationId: integ.id,
    steps: integEntity.data.components.map((comp: Model.IIntegrationComponent) => comp.name),
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
