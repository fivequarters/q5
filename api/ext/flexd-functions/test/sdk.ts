import { IAccount } from './accountResolver';
import { request } from '@5qtrs/request';

export async function deleteFunction(account: IAccount, boundaryId: string, functionId: string) {
  return await request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}`,
  });
}

export async function putFunction(account: IAccount, boundaryId: string, functionId: string, spec: any) {
  return await request({
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}`,
    data: spec,
  });
}

export async function getFunction(account: IAccount, boundaryId: string, functionId: string) {
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}`,
  });
}

export async function getFunctionLocation(account: IAccount, boundaryId: string, functionId: string) {
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}/location`,
  });
}

export async function listFunctions(account: IAccount, boundaryId?: string, cron?: boolean) {
  let url = boundaryId
    ? `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
        account.subscriptionId
      }/boundary/${boundaryId}/function`
    : `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/function`;
  if (cron !== undefined) {
    url += `?cron=${cron}`;
  }
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
    },
    url,
  });
}

export async function deleteAllFunctions(account: IAccount, boundaryId?: string) {
  return await listFunctions(account, boundaryId).then(response => {
    return Promise.all(
      response.data.items.map((x: { boundaryId: string; functionId: string }) =>
        deleteFunction(account, x.boundaryId, x.functionId)
      )
    );
  });
}
