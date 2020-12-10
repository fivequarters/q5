import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addUser, getUser, removeUser, cleanUpUsers } from './sdk';
import './extendJest';

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpUsers(account);
}, 180000);

describe('User', () => {
  describe('Remove', () => {
    test('Removing a user should be supported', async () => {
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
      expect(user).toBeHttp({ statusCode: 204 });
      expect(user.data).toBeUndefined();

      const removed = await getUser(account, original.data.id);
      expect(removed).toBeHttpError(404, `The user '${original.data.id}' does not exist`);
    }, 180000);

    test('Removing a user with an invalid user id should return an error', async () => {
      const userId = `usr-${random()}`;
      const user = await removeUser(account, userId);
      expect(user).toBeHttpError(
        400,
        `"userId" with value "${userId}" fails to match the required pattern: /^usr-[a-g0-9]{16}$/`
      );
    }, 180000);

    test('Removing a non-existing user should return an error', async () => {
      const userId = `usr-${random({ lengthInBytes: 8 })}`;
      const user = await removeUser(account, userId);
      expect(user).toBeHttpError(404, `The user '${userId}' does not exist`);
    }, 180000);

    test('Removing a user with a mal-formed account should return an error', async () => {
      const malformed = await getMalformedAccount();
      const original = await addUser(account, {});
      const user = await removeUser(malformed, original.data.id);
      expect(user).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Removing a user with a non-existing account should return an error', async () => {
      const original = await addUser(account, {});
      const user = await removeUser(await getNonExistingAccount(), original.data.id);
      expect(user).toBeUnauthorizedError();
    }, 180000);
  });
});
