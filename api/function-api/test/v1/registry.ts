import { request, IHttpRequest } from '@5qtrs/request';
import { IAccount } from './accountResolver';

import { AwsRegistry, IRegistryConfig, IRegistryGlobalConfig } from '@5qtrs/registry';

import * as Constants from '@5qtrs/constants';

export async function getConfig(account: IAccount, authorizationAccount?: IAccount['accountId']) {
  const headers: IHttpRequest['headers'] = {
    Authorization: `Bearer ${account.accessToken}`,
    'user-agent': account.userAgent,
  };

  if (authorizationAccount) {
    headers['fusebit-authorization-account-id'] = authorizationAccount;
  }

  return (
    await request({
      method: 'GET',
      headers,
      url: `${account.baseUrl}/v1/account/${account.accountId}/registry/${Constants.REGISTRY_DEFAULT}`,
    })
  ).data;
}

export async function putConfig(account: IAccount, config: IRegistryConfig) {
  return (
    await request({
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'user-agent': account.userAgent,
      },
      url: `${account.baseUrl}/v1/account/${account.accountId}/registry/${Constants.REGISTRY_DEFAULT}`,
      data: config,
    })
  ).status;
}

export async function setupGlobal(masterAccount: string, account: IAccount, masterScope: string, regScope: string) {
  // Create the config for the master account
  const globalReg = (AwsRegistry.create({
    accountId: masterAccount,
    registryId: Constants.REGISTRY_DEFAULT,
  }) as unknown) as AwsRegistry;
  await globalReg.configPut({ scopes: [masterScope] });

  // Point the REGISTRY_GLOBAL at the master account string
  await globalReg.globalConfigPut({
    scopes: [masterScope],
    params: { accountId: masterAccount, registryId: Constants.REGISTRY_DEFAULT },
  });

  // Set the normal account to regScope
  const accountReg = (AwsRegistry.create({
    accountId: account.accountId,
    registryId: Constants.REGISTRY_DEFAULT,
  }) as unknown) as AwsRegistry;
  await accountReg.configPut({ scopes: [regScope] });

  // Set the refreshGlobal for the normal account
  await accountReg.refreshGlobal();

  return { globalReg, accountReg };
}

export function getGlobal() {
  // Return the REGISTRY_GLOBAL config
  // Create the config for the master account
  return new AwsRegistry('').globalConfigGet();
}

export function setGlobal(global: IRegistryGlobalConfig) {
  // Set the REGISTRY_GLOBAL config
  return new AwsRegistry('').globalConfigPut(global);
}
