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
  test('Add new', async () => {
    // Existing account must have at least one reserved scope.
    const existingAccountConfig = await Registry.getConfig(account);
    expect(existingAccountConfig).toBeDefined();
    expect(existingAccountConfig.scopes).toBeDefined();
    expect(existingAccountConfig.url).toBeDefined();

    const reservedScopeCountInExistingAccount = existingAccountConfig.scopes.filter(
      (scope: string) => scope.indexOf(Constants.REGISTRY_RESERVED_SCOPE_PREFIX) === 0
    );
    expect(reservedScopeCountInExistingAccount.length).toBeGreaterThanOrEqual(1);

    // Adding new account must work (http 200)
    const newAccount: IAccountAPI = {
      displayName: boundaryId,
      primaryEmail: 'we-are@fusebit.io',
    };

    const res = await addAccount(account, newAccount);
    expect(res).toBeHttp({ statusCode: 200 });

    const { data: accountCreated } = await getAccount(account, res.data.id);

    // Reserved scope must be set on new account as well
    const accountCreatedLocalProfile: IAccount = {
      ...account,
      accountId: accountCreated.id,
      userAgent: 'fusebit-test',
    };

    const newAccountConfig = await Registry.getConfig(accountCreatedLocalProfile, account.accountId);

    expect(newAccountConfig).toBeDefined();
    expect(newAccountConfig.scopes).toBeDefined();
    expect(newAccountConfig.url).toBeDefined();

    const reservedScopeCount = newAccountConfig.scopes.filter(
      (scope: string) => scope.indexOf(Constants.REGISTRY_RESERVED_SCOPE_PREFIX) === 0
    );
    expect(reservedScopeCount).toBeDefined();
    expect(reservedScopeCount.length).toBeGreaterThanOrEqual(1);

    const isAccountIdInNPMURL = newAccountConfig.url.includes(accountCreatedLocalProfile.accountId);
    expect(isAccountIdInNPMURL).toBe(true);
  }, 180000);
});
