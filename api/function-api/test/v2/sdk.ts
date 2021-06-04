import { IAccount } from './accountResolver';
import { request } from '@5qtrs/request';
import { Model } from '@5qtrs/db';
import * as querystring from 'querystring';

import { getEnv } from '../v1/setup';

let { function5Id } = getEnv();

export interface IRequestOptions {
  uri: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  contentType?: string;
  body?: string | object;
  authz?: string;
}

export interface IDispatchOptions {
  contentType?: string;
  body?: string | object;
  authz?: string;
}

interface IWaitForCompletionParams {
  waitMs: number;
  pollMs: number;
}

const DefaultWaitForCompletionParams: IWaitForCompletionParams = {
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

export const ApiRequestMap: { [key: string]: any } = {
  connector: {
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
          false,
          waitOptions,
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
      return ApiRequestMap.operation.waitForCompletion(account, op.data.operationId, false, waitOptions, options);
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
      getAfter: boolean = false,
      waitOptions: IWaitForCompletionParams = DefaultWaitForCompletionParams,
      options?: IRequestOptions
    ) => {
      const startTime = Date.now();
      let response: any;
      waitOptions = { ...DefaultWaitForCompletionParams, ...waitOptions };
      do {
        response = await ApiRequestMap.operation.get(account, operationId, options);
        if (response.status === 200) {
          if (getAfter) {
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
  });
};

type SessionModes = 'integration' | 'connector';

export async function postSession(account: IAccount, mode: SessionModes, modeId: string, payload: any) {
  return request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': account.userAgent,
    },
    url: `${account.baseUrl}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/${mode}/${modeId}/session`,
    data: payload,
  });
}

export async function putSession(
  account: IAccount,
  mode: SessionModes,
  modeId: string,
  sessionId: string,
  payload: any
) {
  return request({
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': account.userAgent,
    },
    url: `${account.baseUrl}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/${mode}/${modeId}/session/${sessionId}`,
    data: payload,
  });
}

export async function getSession(account: IAccount, mode: SessionModes, modeId: string, sessionId: string) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': account.userAgent,
    },
    url: `${account.baseUrl}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/${mode}/${modeId}/session/${sessionId}`,
  });
}
