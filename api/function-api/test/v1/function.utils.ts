import { IAccount } from './accountResolver';
import { AwsRegistry } from '@5qtrs/registry';
import { terminate_garbage_collection } from '@5qtrs/function-lambda';

import { keyStore, subscriptionCache } from '../../src/routes/globals';

import { defaultFrameworkSemver, defaultOAuthConnectorSemver } from '../../src/routes/service/BaseEntityService';

export const createRegistry = (account: IAccount, boundaryId: string) => {
  return AwsRegistry.create({ ...getParams('', account, boundaryId), registryId: 'default' }, {});
};

export const getParams = (functionId: string, account: IAccount, boundaryId: string) => ({
  accountId: account.accountId,
  subscriptionId: account.subscriptionId,
  boundaryId,
  functionId,
  functionPath: '/',
});

export const fakeAgent = {
  checkPermissionSubset: async () => Promise.resolve(),
};

beforeAll(async () => {
  return keyStore.rekey();
});
afterAll(() => {
  keyStore.shutdown();
  terminate_garbage_collection();
});

export { keyStore, subscriptionCache, defaultFrameworkSemver, defaultOAuthConnectorSemver };
