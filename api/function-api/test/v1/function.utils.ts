import { IAccount } from './accountResolver';
import { AwsRegistry } from '@5qtrs/registry';
import { AwsKeyStore, SubscriptionCache } from '@5qtrs/runas';

export const createRegistry = (account: IAccount, boundaryId: string) => {
  return AwsRegistry.create({ ...getParams('', account, boundaryId), registryId: 'default' }, {});
};

export const getParams = (functionId: string, account: IAccount, boundaryId: string) => ({
  accountId: account.accountId,
  subscriptionId: account.subscriptionId,
  boundaryId,
  functionId,
});

export const fakeAgent = {
  checkPermissionSubset: async () => Promise.resolve(),
};

export const keyStore = new AwsKeyStore({});

// Create and load a cache with the current subscription->account mapping
export const subscriptionCache = new SubscriptionCache({});
subscriptionCache.refresh();
