import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addUser, getUser, removeUser, cleanUpUsers } from './sdk';
import { extendExpect } from './extendJest';

const expectMore = extendExpect(expect);

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpUsers(account);
}, 20000);

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
      expect(user.status).toBe(204);
      expect(user.data).toBeUndefined();

      const removed = await getUser(account, original.data.id);
      expectMore(removed).toBeHttpError(404, `The user '${original.data.id}' does not exist`);
    }, 20000);

    test('Removing a user with an invalid user id should return an error', async () => {
      const userId = `usr-${random()}`;
      const user = await removeUser(account, userId);
      expectMore(user).toBeHttpError(
        400,
        `"userId" with value "${userId}" fails to match the required pattern: /^usr-[a-g0-9]{16}$/`
      );
    }, 20000);

    test('Removing a non-existing user should return an error', async () => {
      const userId = `usr-${random({ lengthInBytes: 8 })}`;
      const user = await removeUser(account, userId);
      expectMore(user).toBeHttpError(404, `The user '${userId}' does not exist`);
    }, 20000);

    test('Removing a user with a mal-formed account should return an error', async () => {
      const malformed = await getMalformedAccount();
      const original = await addUser(account, {});
      const user = await removeUser(malformed, original.data.id);
      expectMore(user).toBeMalformedAccountError(malformed.accountId);
    }, 10000);

    test('Removing a user with a non-existing account should return an error', async () => {
      const original = await addUser(account, {});
      const user = await removeUser(await getNonExistingAccount(), original.data.id);
      expectMore(user).toBeUnauthorizedError();
    }, 10000);
  });
});
