import { addAccount, addSubscription, addIssuer, addUser, getAccount, removeAccount, cleanUpAccounts } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const accountId = account.accountId;
afterEach(async () => {
  account.accountId = accountId;
  await cleanUpAccounts(account);
}, 180000);

const accountDetails = {
  account: { displayName: 'test/account.add', primaryEmail: 'test@test.com' },
  subscription: { displayName: 'test/account/sub' },
  issuer: {
    issuerId: 'https://fusebit.auth0.com/',
    data: { displayName: 'Auth0', jsonKeysUrl: 'https://fusebit.auth0.com/.well-known/jwks.json' },
  },
  owner: {
    firstName: 'test/accountUser',
    lastName: 'test/accountUser',
    primaryEmail: 'test@test.com',
    identities: [
      {
        issuerId: 'auth0 issuer',
        subject: 'google-oauth2|108143954401429509791',
      },
    ],
    access: {
      allow: [{ resource: `/account/{{accountId}}/subscription/{{subscriptionId}}/`, action: '*' }],
    },
  },
};

describe('Account Add', () => {
  test.only('Add a new account', async () => {
    const newAccount = await addAccount(account, accountDetails.account);
    expect(newAccount).toBeHttp({
      statusCode: 200,
      has: ['id'],
      data: accountDetails.account,
    });
    const authzAccountId = account.accountId;
    account.accountId = newAccount.data.id;

    const newSub = await addSubscription(account, accountDetails.subscription, { authzAccountId });
    expect(newSub).toBeHttp({
      statusCode: 200,
      has: ['id'],
      data: accountDetails.subscription,
    });

    const newIssuer = await addIssuer(account, accountDetails.issuer.issuerId, accountDetails.issuer.data, {
      authzAccountId,
    });
    expect(newIssuer).toBeHttp({
      statusCode: 200,
      data: { id: accountDetails.issuer.issuerId, ...accountDetails.issuer.data },
    });
    const newUser = await addUser(account, accountDetails.owner, { authzAccountId });
    expect(newUser).toBeHttp({ statusCode: 200, has: ['id'] });
  });
});
