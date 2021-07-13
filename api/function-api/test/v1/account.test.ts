import * as Constants from '@5qtrs/constants';
import { IAccount as IAccountAPI } from '@5qtrs/account-data';

import { IAccount } from './accountResolver';
import * as Registry from './registry';
import { addAccount, getAccount } from './sdk';
import { getEnv } from './setup';

let { account, boundaryId } = getEnv();

beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});

describe('Account Management', () => {
  test('Add', async () => {
    const newAccount: IAccountAPI = {
      displayName: boundaryId,
      primaryEmail: 'we-are@fusebit.io',
    };

    const res = await addAccount(account, newAccount);
    expect(res).toBeHttp({ statusCode: 200 });

    const { data: accountCreated } = await getAccount(account, res.data.id);

    const accountCreatedLocalProfile: IAccount = {
      ...account,
      accountId: accountCreated.id,
      userAgent: 'fusebit-test',
    };

    const { scopes, url } = await Registry.getConfig(accountCreatedLocalProfile, account.accountId);

    const reservedScopeCount = scopes.filter(
      (scope: string) => scope.indexOf(Constants.REGISTRY_RESERVED_SCOPE_PREFIX) === 0
    );
    expect(reservedScopeCount.length).toBeGreaterThanOrEqual(1);

    const isAccountIdInNPMURL = url.includes(accountCreatedLocalProfile.accountId);
    expect(isAccountIdInNPMURL).toBe(true);
  }, 180000);
});
