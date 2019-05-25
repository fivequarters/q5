import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addUser, getUser, removeUser, cleanUpUsers } from './sdk';
import { random } from '@5qtrs/random';

let account: IAccount = FakeAccount;
let invalidAccount: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
  invalidAccount = {
    accountId: 'acc-9999999999999999',
    subscriptionId: account.subscriptionId,
    baseUrl: account.baseUrl,
    accessToken: account.accessToken,
  };
});

afterEach(async () => {
  await cleanUpUsers(account);
}, 20000);

describe('User', () => {
  describe('Remove', () => {
    test('Getting a user should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });
      const user = await removeUser(account, original.data.id);
      expect(user.status).toBe(204);
      expect(user.data).toBeUndefined();

      const removed = await getUser(account, original.data.id);
      expect(removed.status).toBe(404);
    }, 20000);

    test('Removing a user with an invalid user id should return an error', async () => {
      const userId = `usr-${random()}`;
      const user = await removeUser(account, userId);
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe(
        `"userId" with value "${userId}" fails to match the required pattern: /^usr-[a-g0-9]{16}$/`
      );
    }, 20000);

    test('Removing a non-existing user should return an error', async () => {
      const userId = `usr-${random({ lengthInBytes: 8 })}`;
      const user = await removeUser(account, userId);
      expect(user.status).toBe(404);
      expect(user.data.status).toBe(404);
      expect(user.data.statusCode).toBe(404);
      expect(user.data.message).toBe(`The user '${userId}' does not exist`);
    }, 20000);

    test('Removing an user with a non-existing account should return an error', async () => {
      const original = await addUser(account, {});
      const user = await removeUser(invalidAccount, original.data.id);
      expect(user.status).toBe(404);
      expect(user.data.status).toBe(404);
      expect(user.data.statusCode).toBe(404);

      const message = user.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 10000);
  });
});
