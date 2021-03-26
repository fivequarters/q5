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
