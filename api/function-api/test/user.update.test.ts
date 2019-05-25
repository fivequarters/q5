import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addUser, updateUser, cleanUpUsers } from './sdk';
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
  describe('Update', () => {
    test('Updating a user with a first name and an existing first name should be supported', async () => {
      const original = await addUser(account, { firstName: 'first - test user' });
      const user = await updateUser(account, original.data.id, { firstName: 'updated - test user' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBe('updated - test user');
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with a first name and no existing first name should be supported', async () => {
      const original = await addUser(account, { firstName: 'first - test user' });
      const user = await updateUser(account, original.data.id, { firstName: 'updated - test user' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBe('updated - test user');
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with a first name should not alter other fields', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });
      const user = await updateUser(account, original.data.id, { firstName: 'updated' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBe('updated');
      expect(user.data.lastName).toBe('last');
      expect(user.data.primaryEmail).toBe('email');
      expect(user.data.identities).toEqual(identities);
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with a last name and an existing last name should be supported', async () => {
      const original = await addUser(account, { lastName: 'lastName - test user' });
      const user = await updateUser(account, original.data.id, { lastName: 'updated - test user' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBe('updated - test user');
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with a last name and no existing last name should be supported', async () => {
      const original = await addUser(account, {});
      const user = await updateUser(account, original.data.id, { lastName: 'updated - test user' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBe('updated - test user');
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with a last name should not alter other fields', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });
      const user = await updateUser(account, original.data.id, { lastName: 'updated' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBe('first');
      expect(user.data.lastName).toBe('updated');
      expect(user.data.primaryEmail).toBe('email');
      expect(user.data.identities).toEqual(identities);
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with a primary email and an existing primary email should be supported', async () => {
      const original = await addUser(account, { primaryEmail: 'test@users.com' });
      const user = await updateUser(account, original.data.id, { primaryEmail: 'test-updated@users.com' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBe('test-updated@users.com');
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with a primary email and no existing primary email should be supported', async () => {
      const original = await addUser(account, {});
      const user = await updateUser(account, original.data.id, { primaryEmail: 'test-updated@users.com' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBe('test-updated@users.com');
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with a primary email should not alter other fields', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });
      const user = await updateUser(account, original.data.id, { primaryEmail: 'updated' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBe('first');
      expect(user.data.lastName).toBe('last');
      expect(user.data.primaryEmail).toBe('updated');
      expect(user.data.identities).toEqual(identities);
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with an identity and an existing identity should be supported', async () => {
      const original = await addUser(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
      const identities = [{ issuerId: 'foo', subject: `sub-${random()}` }];
      const user = await updateUser(account, original.data.id, { identities });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toEqual(identities);
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with an identity and no existing identity should be supported', async () => {
      const original = await addUser(account, {});
      const identities = [{ issuerId: 'foo', subject: `sub-${random()}` }];
      const user = await updateUser(account, original.data.id, { identities });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toEqual(identities);
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with an identity should not alter other fields', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });

      identities[0].subject = `sub-${random()}-updated`;
      const user = await updateUser(account, original.data.id, { identities });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBe('first');
      expect(user.data.lastName).toBe('last');
      expect(user.data.primaryEmail).toBe('email');
      expect(user.data.identities).toEqual(identities);
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with an existing identity should return an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ issuerId: 'test', subject }];
      await addUser(account, { identities });
      const original = await addUser(account, { identities: [{ issuerId: 'test', subject: `sub-${random()}-other` }] });
      const user = await updateUser(account, original.data.id, { identities });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe(
        `The identity with issuer 'test' and subject '${subject}' is already associated with a user`
      );
    }, 20000);

    test('Updating a user with access should normalize resource ', async () => {
      const original = await addUser(account, { access: { allow: [{ action: '*', resource: '/account/abc' }] } });
      const access = { allow: [{ action: '*', resource: '/account/xyz' }] };
      const user = await updateUser(account, original.data.id, { access });

      access.allow[0].resource = `${access.allow[0].resource}/`;
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with access and existing access should be supported', async () => {
      const original = await addUser(account, { access: { allow: [{ action: '*', resource: '/account/abc' }] } });
      const access = { allow: [{ action: '*', resource: '/account/xyz/' }] };
      const user = await updateUser(account, original.data.id, { access });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with access and no existing access should be supported', async () => {
      const original = await addUser(account, {});
      const access = { allow: [{ action: '*', resource: '/account/xyz/' }] };
      const user = await updateUser(account, original.data.id, { access });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with an access should not alter other fields', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });

      access.allow[0].action = `client:*`;
      const user = await updateUser(account, original.data.id, { access });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBe('first');
      expect(user.data.lastName).toBe('last');
      expect(user.data.primaryEmail).toBe('email');
      expect(user.data.identities).toEqual(identities);
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Updating a user with an empty string first name is not supported', async () => {
      const original = await addUser(account, { firstName: 'firstName - test user' });
      const user = await updateUser(account, original.data.id, { firstName: '' });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"firstName" is not allowed to be empty');
    }, 20000);

    test('Updating a user with an empty string last name is not supported', async () => {
      const original = await addUser(account, {});
      const user = await updateUser(account, original.data.id, { lastName: '' });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"lastName" is not allowed to be empty');
    }, 20000);

    test('Updating a user with an empty string primary email is not supported', async () => {
      const original = await addUser(account, { primaryEmail: 'email - test user' });
      const user = await updateUser(account, original.data.id, { primaryEmail: '' });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"primaryEmail" is not allowed to be empty');
    }, 20000);

    test('Updating a user with an identity with an empty issuerId is not supported', async () => {
      const original = await addUser(account, {});
      const user = await updateUser(account, original.data.id, {
        identities: [{ issuerId: '', subject: `sub-${random()}` }],
      });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"issuerId" is not allowed to be empty');
    }, 20000);

    test('Updating a user with an identity with a missing issuerId is not supported', async () => {
      const original = await addUser(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
      const user = await updateUser(account, original.data.id, { identities: [{ subject: `sub-${random()}` }] });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"issuerId" is required');
    }, 20000);

    test('Updating a user with an identity with an empty subject is not supported', async () => {
      const original = await addUser(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
      const user = await updateUser(account, original.data.id, { identities: [{ issuerId: 'foo', subject: '' }] });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"subject" is not allowed to be empty');
    }, 20000);

    test('Updating a user with an identity with a missing subject is not supported', async () => {
      const original = await addUser(account, {});
      const user = await updateUser(account, original.data.id, { identities: [{ issuerId: 'foo' }] });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"subject" is required');
    }, 20000);

    test('Updating a user with access with an empty action is not supported', async () => {
      const original = await addUser(account, {});
      const user = await updateUser(account, original.data.id, { access: { allow: [{ action: '', resource: '/' }] } });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"action" is not allowed to be empty');
    }, 20000);

    test('Updating a user with access with a missing action is not supported', async () => {
      const original = await addUser(account, { access: { allow: [{ action: '*', resource: '/' }] } });
      const user = await updateUser(account, original.data.id, { access: { allow: [{ resource: '/' }] } });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"action" is required');
    }, 20000);

    test('Updating a user with access with an empty resource is not supported', async () => {
      const original = await addUser(account, { access: { allow: [{ action: '*', resource: '/' }] } });
      const user = await updateUser(account, original.data.id, { access: { allow: [{ action: '*', resource: '' }] } });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"resource" is not allowed to be empty');
    }, 20000);

    test('Updating a user with access with a missing resource is not supported', async () => {
      const original = await addUser(account, {});
      const user = await updateUser(account, original.data.id, { access: { allow: [{ action: '*' }] } });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"resource" is required');
    }, 20000);

    test('Updating a user with access with no allow is not supported', async () => {
      const original = await addUser(account, { access: { allow: [{ action: '*', resource: '/' }] } });
      const user = await updateUser(account, original.data.id, { access: {} });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"allow" is required');
    }, 20000);

    test('Updating a user with access with an empty allow array is not supported', async () => {
      const original = await addUser(account, {});
      const user = await updateUser(account, original.data.id, { access: { allow: [] } });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"allow" must contain at least 1 items');
    }, 20000);

    test('Updating a user with identities with an empty array is not supported', async () => {
      const original = await addUser(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
      const user = await updateUser(account, original.data.id, { identities: [] });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"identities" must contain at least 1 items');
    }, 20000);

    test('Updating a user with a non-existing account should return an error', async () => {
      const original = await addUser(account, {});
      const user = await updateUser(invalidAccount, original.data.id, {});
      expect(user.status).toBe(404);
      expect(user.data.status).toBe(404);
      expect(user.data.statusCode).toBe(404);

      const message = user.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 20000);
  });
});
