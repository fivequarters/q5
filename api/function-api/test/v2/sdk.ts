import { IAccount } from '../v1/accountResolver';
import { request } from '@5qtrs/request';

export async function listConnectors(account: IAccount) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/connector`,
  });
}

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
