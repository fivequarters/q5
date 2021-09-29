import * as Constants from '@5qtrs/constants';
import { IAccount as IAccountAPI } from '@5qtrs/account-data';

import { IAccount } from './accountResolver';
import * as Registry from './registry';
import { addAccount, getAccount, patchAccount } from './sdk';
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

  test('Patch existing', async () => {
    const { data: currentAccountDetails } = await getAccount(account);
    const patchedAccountDetails = {
      displayName: `${currentAccountDetails} ${Date.now()}`,
    };
    const response = await patchAccount(account, patchedAccountDetails);
    expect(response).toBeHttp({ statusCode: 200 });

    const { data: updatedAccountDetails } = await getAccount(account);
    expect(updatedAccountDetails.displayName).toBe(patchedAccountDetails.displayName);
  });

  test('Ignores id on the patch body', async () => {
    const { data: currentAccountDetails } = await getAccount(account);
    const currentId = currentAccountDetails.id;
    const patchedAccountDetails = {
      id: currentId.substring(0, currentId.length - 3) + 'zzz',
      displayName: `${currentAccountDetails} ${Date.now()}`,
    };
    const response = await patchAccount(account, patchedAccountDetails);
    expect(response).toBeHttp({ statusCode: 200 });

    const { data: updatedAccountDetails } = await getAccount(account);
    expect(updatedAccountDetails.id).toBe(currentId);
    expect(updatedAccountDetails.displayName).toBe(patchedAccountDetails.displayName);
  });
});
