import { IAccount } from './accountResolver';
import { request } from '@5qtrs/request';
import { Model } from '@5qtrs/db';
import * as querystring from 'querystring';

import { getEnv } from '../v1/setup';

let { function5Id } = getEnv();

const testEntitiesCreated: { entityType: Model.EntityType; id: string }[] = [];

export const cleanupEntities = async (account: IAccount) => {
  await (Promise as any).allSettled(
    testEntitiesCreated.map(({ entityType, id }) => (ApiRequestMap as any)[entityType].deleteAndWait(account, id))
  );
  testEntitiesCreated.length = 0; // Clear the array.
};

interface IWaitForCompletionParams {
  waitMs: number;
  pollMs: number;
}

const DefaultWaitForCompletionParams: IWaitForCompletionParams = {
  waitMs: 10000,
  pollMs: 100,
};

export const ApiRequestMap: { [key: string]: any } = {
  connector: {
    get: async (account: IAccount, connectorId: string) => {
      return v2Request(account, { method: 'GET', uri: `/connector/${encodeURI(connectorId)}` });
    },
    list: async (
      account: IAccount,
      query?: { tag?: { tagKey: string; tagValue?: string }; limit?: number; next?: string; idPrefix?: string }
    ) => {
      const tagString = query?.tag?.tagValue ? `${query.tag.tagKey}=${query.tag.tagValue}` : query?.tag?.tagKey;
      const queryParams: { [key: string]: any } = { ...query, tag: tagString };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      return v2Request(account, { method: 'GET', uri: `/connector?${querystring.stringify(queryParams)}` });
    },
    post: async (account: IAccount, body: Model.IEntity) => {
      testEntitiesCreated.push({ entityType: Model.EntityType.connector, id: body.id });
      return v2Request(account, { method: 'POST', uri: '/connector', body });
    },
    postAndWait: async (account: IAccount, body: Model.IEntity) => {
      const op = await ApiRequestMap.connector.post(account, body);
      expect(op).toBeHttp({ statusCode: 202 });
      return ApiRequestMap.operation.waitForCompletion(account, op.data.operationId);
    },
    put: async (account: IAccount, connectorId: string, body: Model.IEntity) =>
      v2Request(account, { method: 'PUT', uri: `/connector/${encodeURI(connectorId)}`, body }),
    putAndWait: async (account: IAccount, connectorId: string, body: Model.IEntity) => {
      const op = await ApiRequestMap.connector.put(account, connectorId, body);
      expect(op).toBeHttp({ statusCode: 202 });
      return ApiRequestMap.operation.waitForCompletion(account, op.data.operationId);
    },
    delete: async (account: IAccount, connectorId: string) =>
      v2Request(account, { method: 'DELETE', uri: `/connector/${connectorId}` }),
    deleteAndWait: async (account: IAccount, entityId: string) => {
      let wait: any;
      do {
        const op = await ApiRequestMap.connector.delete(account, entityId);
        expect(op).toBeHttp({ statusCode: 202 });
        wait = await ApiRequestMap.operation.waitForCompletion(account, op.data.operationId, false);
      } while (wait.status === 428);

      return wait;
    },
    tags: {
      get: async (account: IAccount, connectorId: string, tagKey: string = '') =>
        v2Request(account, { method: 'GET', uri: `/connector/${connectorId}/tag/${tagKey}` }),
      delete: async (account: IAccount, connectorId: string, tagKey: string = '') =>
        v2Request(account, { method: 'DELETE', uri: `/connector/${connectorId}/tag/${tagKey}` }),
      put: async (account: IAccount, connectorId: string, tagKey: string, tagValue: string) =>
        v2Request(account, { method: 'PUT', uri: `/connector/${connectorId}/tag/${tagKey}/${tagValue}` }),
    },
  },
  integration: {
    get: async (account: IAccount, integrationId: string) => {
      return v2Request(account, { method: 'GET', uri: `/integration/${encodeURI(integrationId)}` });
    },
    list: async (
      account: IAccount,
      query?: { tag?: { tagKey: string; tagValue?: string }; limit?: number; next?: string; idPrefix?: string }
    ) => {
      const tagString = query?.tag?.tagValue ? `${query.tag.tagKey}=${query.tag.tagValue}` : query?.tag?.tagKey;
      const queryParams: { [key: string]: any } = { ...query, tag: tagString };
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === undefined) {
          delete queryParams[key];
        }
      });
      return v2Request(account, { method: 'GET', uri: `/integration?${querystring.stringify(queryParams)}` });
    },
    post: async (account: IAccount, body: Model.IEntity) => {
      testEntitiesCreated.push({ entityType: Model.EntityType.integration, id: body.id });
      return v2Request(account, { method: 'POST', uri: '/integration', body });
    },
    postAndWait: async (account: IAccount, body: Model.IEntity) => {
      const op = await ApiRequestMap.integration.post(account, body);
      expect(op).toBeHttp({ statusCode: 202 });
      return ApiRequestMap.operation.waitForCompletion(account, op.data.operationId);
    },
    put: async (account: IAccount, integrationId: string, body: Model.IEntity) =>
      v2Request(account, { method: 'PUT', uri: `/integration/${encodeURI(integrationId)}`, body }),
    putAndWait: async (account: IAccount, integrationId: string, body: Model.IEntity) => {
      const op = await ApiRequestMap.integration.put(account, integrationId, body);
      expect(op).toBeHttp({ statusCode: 202 });
      return ApiRequestMap.operation.waitForCompletion(account, op.data.operationId);
    },
    delete: async (account: IAccount, integrationId: string) =>
      v2Request(account, { method: 'DELETE', uri: `/integration/${integrationId}` }),
    deleteAndWait: async (account: IAccount, entityId: string) => {
      const op = await ApiRequestMap.integration.delete(account, entityId);
      expect(op).toBeHttp({ statusCode: 202 });
      return ApiRequestMap.operation.waitForCompletion(account, op.data.operationId, false);
    },
    tags: {
      get: async (account: IAccount, integrationId: string, tagKey: string = '') =>
        v2Request(account, { method: 'GET', uri: `/integration/${integrationId}/tag/${tagKey}` }),
      delete: async (account: IAccount, integrationId: string, tagKey: string = '') =>
        v2Request(account, { method: 'DELETE', uri: `/integration/${integrationId}/tag/${tagKey}` }),
      put: async (account: IAccount, integrationId: string, tagKey: string, tagValue: string) =>
        v2Request(account, { method: 'PUT', uri: `/integration/${integrationId}/tag/${tagKey}/${tagValue}` }),
    },
  },
  operation: {
    get: async (account: IAccount, operationId: string) => {
      return v2Request(account, { method: 'GET', uri: `/operation/${encodeURI(operationId)}` });
    },
    waitForCompletion: async (
      account: IAccount,
      operationId: string,
      getAfter: boolean = false,
      options: IWaitForCompletionParams = DefaultWaitForCompletionParams
    ) => {
      const startTime = Date.now();
      let response: any;
      do {
        response = await ApiRequestMap.operation.get(account, operationId);
        if (response.status === 200) {
          if (getAfter) {
            response = await ApiRequestMap[response.data.location.entityType].get(
              account,
              response.data.location.entityId
            );
          }
          break;
        }
        if (response.status !== 202) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, options.pollMs));
      } while (startTime + options.waitMs > Date.now());
      return response;
    },
  },
};

export interface IRequestOptions {
  uri: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: object;
}
export const v2Request = async (account: IAccount, requestOptions: IRequestOptions) => {
  return request({
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v2/account/${account.accountId}/subscription/${account.subscriptionId}${requestOptions.uri}`,
    method: requestOptions.method,
    data: requestOptions.body,
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
