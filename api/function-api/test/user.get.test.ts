import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addUser, getUser, cleanUpUsers } from './sdk';
import { random } from '@5qtrs/random';
import { extendExpect } from './extendJest';

const expectMore = extendExpect(expect);

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpUsers(account);
}, 180000);

describe('User', () => {
  describe('Get', () => {
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
      const user = await getUser(account, original.data.id);
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBe('first');
      expect(user.data.lastName).toBe('last');
      expect(user.data.primaryEmail).toBe('email');
      expect(user.data.identities).toEqual(identities);
      expect(user.data.access).toEqual(access);
      expect(user.data.id).toBe(original.data.id);
    }, 180000);

    test('Getting a user with an invalid user id should return an error', async () => {
      const userId = `usr-${random()}`;
      const user = await getUser(account, userId);
      expectMore(user).toBeHttpError(
        400,
        `"userId" with value "${userId}" fails to match the required pattern: /^usr-[a-g0-9]{16}$/`
      );
    }, 180000);

    test('Getting a non-existing user should return an error', async () => {
      const userId = `usr-${random({ lengthInBytes: 8 })}`;
      const user = await getUser(account, userId);
      expectMore(user).toBeHttpError(404, `The user '${userId}' does not exist`);
    }, 180000);

    test('Getting a user with a malformed account should return an error', async () => {
      const malformed = await getMalformedAccount();
      const original = await addUser(account, {});
      const user = await getUser(malformed, original.data.id);
      expectMore(user).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Getting a user with a non-existing account should return an error', async () => {
      const original = await addUser(account, {});
      const user = await getUser(await getNonExistingAccount(), original.data.id);
      expectMore(user).toBeUnauthorizedError();
    }, 180000);
  });
});
