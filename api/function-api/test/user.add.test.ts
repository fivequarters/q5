import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addUser, addClient, cleanUpUsers } from './sdk';
import { random } from '@5qtrs/random';
import './extendJest';

let account: IAccount = FakeAccount;
beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpUsers(account);
}, 180000);

describe('User', () => {
  describe('Add', () => {
    test('Adding a user should generate a user id', async () => {
      const user = await addUser(account, {});
      expect(user).toBeHttp({ statusCode: 200 });
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 180000);

    test('Adding a user with a first name should be supported', async () => {
      const user = await addUser(account, { firstName: 'first - test user' });
      expect(user).toBeHttp({ statusCode: 200 });
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBe('first - test user');
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 180000);

    test('Adding a user with a last name should be supported', async () => {
      const user = await addUser(account, { lastName: 'last - test user' });
      expect(user).toBeHttp({ statusCode: 200 });
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBe('last - test user');
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 180000);

    test('Adding a user with a primary email should be supported', async () => {
      const user = await addUser(account, { primaryEmail: 'test@users.com' });
      expect(user).toBeHttp({ statusCode: 200 });
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBe('test@users.com');
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 180000);

    test('Adding a user with an identity should be supported', async () => {
      const identities = [{ issuerId: 'foo', subject: `subj-${random()}` }];
      const user = await addUser(account, { identities });
      expect(user).toBeHttp({ statusCode: 200 });
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toEqual(identities);
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 180000);

    test('Adding a user with access should be supported', async () => {
      const access = { allow: [{ action: '*', resource: '/' }] };
      const user = await addUser(account, { access });
      expect(user).toBeHttp({ statusCode: 200 });
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 180000);

    test('Adding a user with access should normalize the resource string', async () => {
      const access = { allow: [{ action: '*', resource: '/account/abc' }] };
      const user = await addUser(account, { access });

      access.allow[0].resource = `${access.allow[0].resource}/`;

      expect(user).toBeHttp({ statusCode: 200 });
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 180000);

    test('Adding a user with an id returns an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ id: 'usr-5555555555555555', issuerId: 'test', subject }];
      const client = await addClient(account, { identities });
      expect(client).toBeHttpError(400, '"id" is not allowed');
    }, 180000);

    test('Adding a user with an empty string first name is not supported', async () => {
      const user = await addUser(account, { firstName: '' });
      expect(user).toBeHttpError(400, '"firstName" is not allowed to be empty');
    }, 180000);

    test('Adding a user with an empty string last name is not supported', async () => {
      const user = await addUser(account, { lastName: '' });
      expect(user).toBeHttpError(400, '"lastName" is not allowed to be empty');
    }, 180000);

    test('Adding a user with an empty string primary email is not supported', async () => {
      const user = await addUser(account, { primaryEmail: '' });
      expect(user).toBeHttpError(400, '"primaryEmail" is not allowed to be empty');
    }, 180000);

    test('Adding a user with an exisitng identity returns an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ issuerId: 'test', subject }];
      await addUser(account, { identities });
      const user = await addUser(account, { identities });
      expect(user).toBeHttpError(
        400,
        `The identity with issuer 'test' and subject '${subject}' is already associated with a user or client`
      );
    }, 180000);

    test('Adding a user with an exisitng client identity returns an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ issuerId: 'test', subject }];
      await addClient(account, { identities });
      const user = await addUser(account, { identities });
      expect(user).toBeHttpError(
        400,
        `The identity with issuer 'test' and subject '${subject}' is already associated with a user or client`
      );
    }, 180000);

    test('Adding a user with an identity with an empty issuerId is not supported', async () => {
      const identities = [{ issuerId: '', subject: `sub-${random()}` }];
      const user = await addUser(account, { identities });
      expect(user).toBeHttpError(400, '"issuerId" is not allowed to be empty');
    }, 180000);

    test('Adding a user with an identity with a missing issuerId is not supported', async () => {
      const identities = [{ subject: `sub-${random()}` }];
      const user = await addUser(account, { identities });
      expect(user).toBeHttpError(400, '"issuerId" is required');
    }, 180000);

    test('Adding a user with an identity with an empty subject is not supported', async () => {
      const identities = [{ issuerId: 'foo', subject: '' }];
      const user = await addUser(account, { identities });
      expect(user).toBeHttpError(400, '"subject" is not allowed to be empty');
    }, 180000);

    test('Adding a user with an identity with a missing subject is not supported', async () => {
      const identities = [{ issuerId: 'foo' }];
      const user = await addUser(account, { identities });
      expect(user).toBeHttpError(400, '"subject" is required');
    }, 180000);

    test('Adding a user with access with an empty action is not supported', async () => {
      const access = { allow: [{ action: '', resource: '/' }] };
      const user = await addUser(account, { access });
      expect(user).toBeHttpError(400, '"action" is not allowed to be empty');
    }, 180000);

    test('Adding a user with access with a missing action is not supported', async () => {
      const access = { allow: [{ resource: '/' }] };
      const user = await addUser(account, { access });
      expect(user).toBeHttpError(400, '"action" is required');
    }, 180000);

    test('Adding a user with access with an empty resource is not supported', async () => {
      const access = { allow: [{ action: '*', resource: '' }] };
      const user = await addUser(account, { access });
      expect(user).toBeHttpError(400, '"resource" is not allowed to be empty');
    }, 180000);

    test('Adding a user with access with a missing resource is not supported', async () => {
      const access = { allow: [{ action: '*' }] };
      const user = await addUser(account, { access });
      expect(user).toBeHttpError(400, '"resource" is required');
    }, 180000);

    test('Adding a user with access with no allow is not supported', async () => {
      const access = {};
      const user = await addUser(account, { access });
      expect(user).toBeHttpError(400, '"allow" is required');
    }, 180000);

    test('Adding a user with access with an empty allow array is supported', async () => {
      const access = { allow: [] };
      const user = await addUser(account, { access });
      expect(user).toBeHttp({ statusCode: 200 });
      expect(user.data).toEqual({ id: user.data.id });
    }, 180000);

    test('Adding a user with identities with an empty array is supported', async () => {
      const identities: any = [];
      const user = await addUser(account, { identities });
      expect(user).toBeHttp({ statusCode: 200 });
      expect(user.data).toEqual({ id: user.data.id });
    }, 180000);

    test('Adding a user with a malformed account should return an error', async () => {
      const malformed = await getMalformedAccount();
      const user = await addUser(malformed, {});
      expect(user).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Adding a user with a non-existing account should return an error', async () => {
      const user = await addUser(await getNonExistingAccount(), {});
      expect(user).toBeUnauthorizedError();
    }, 180000);
  });
});
