import { IAccount } from './accountResolver';
import { request } from '@5qtrs/request';
import { Model } from '@5qtrs/db';
import * as querystring from 'querystring';

const testEntitiesCreated: { entityType: string; id: string }[] = [];

export const cleanupEntities = async (account: IAccount) => {
  await (Promise as any).allSettled(
    testEntitiesCreated.map(({ entityType, id }) => (ApiRequestMap as any)[entityType].delete(account, id))
  );
};

export const ApiRequestMap = {
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
      testEntitiesCreated.push({ entityType: 'connector', id: body.id });
      return v2Request(account, { method: 'POST', uri: '/connector', body });
    },
    put: async (account: IAccount, connectorId: string, body: Model.IEntity) =>
      v2Request(account, { method: 'PUT', uri: `/connector/${encodeURI(connectorId)}`, body }),
    delete: async (account: IAccount, connectorId: string) =>
      v2Request(account, { method: 'DELETE', uri: `/connector/${connectorId}` }),
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
      testEntitiesCreated.push({ entityType: 'Integration', id: body.id });
      return v2Request(account, { method: 'POST', uri: '/integration', body });
    },
    put: async (account: IAccount, integrationId: string, body: Model.IEntity) =>
      v2Request(account, { method: 'PUT', uri: `/integration/${encodeURI(integrationId)}`, body }),
    delete: async (account: IAccount, integrationId: string) =>
      v2Request(account, { method: 'DELETE', uri: `/integration/${integrationId}` }),
    tags: {
      get: async (account: IAccount, integrationId: string, tagKey: string = '') =>
        v2Request(account, { method: 'GET', uri: `/integration/${integrationId}/tag/${tagKey}` }),
      delete: async (account: IAccount, integrationId: string, tagKey: string = '') =>
        v2Request(account, { method: 'DELETE', uri: `/integration/${integrationId}/tag/${tagKey}` }),
      put: async (account: IAccount, integrationId: string, tagKey: string, tagValue: string) =>
        v2Request(account, { method: 'PUT', uri: `/integration/${integrationId}/tag/${tagKey}/${tagValue}` }),
    },
  },
};

export interface RequestOptions {
  uri: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: object;
}
export const v2Request = async (account: IAccount, requestOptions: RequestOptions) => {
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
