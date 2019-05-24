import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addUser, listUsers, updateUser, getUser, removeUser, cleanUpUsers } from './sdk';
import { random } from '@5qtrs/random';

let account: IAccount = FakeAccount;
let invalidAccount: IAccount = FakeAccount;
let testRunId: string = '00000';

beforeAll(async () => {
  account = await resolveAccount();
  invalidAccount = {
    accountId: 'acc-9999999999999999',
    subscriptionId: account.subscriptionId,
    baseUrl: account.baseUrl,
    accessToken: account.accessToken,
  };
  testRunId = random() as string;
});

afterEach(async () => {
  await cleanUpUsers(account);
}, 20000);

describe('User', () => {
  describe('Add', () => {
    test('Adding a user should generate a user id', async () => {
      const user = await addUser(account, {});
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Adding a user with a first name should be supported', async () => {
      const user = await addUser(account, { firstName: 'first - test user' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBe('first - test user');
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Adding a user with a last name should be supported', async () => {
      const user = await addUser(account, { lastName: 'last - test user' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBe('last - test user');
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Adding a user with a primary email should be supported', async () => {
      const user = await addUser(account, { primaryEmail: 'test@users.com' });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBe('test@users.com');
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Adding a user with an identity should be supported', async () => {
      const identities = [{ issuerId: 'foo', subject: `subj-${random()}` }];
      const user = await addUser(account, { identities });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toEqual(identities);
      expect(user.data.access).toBeUndefined();
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Adding a user with access should be supported', async () => {
      const access = { allow: [{ action: '*', resource: '/' }] };
      const user = await addUser(account, { access });
      expect(user.status).toBe(200);
      expect(user.data.id).toBeDefined();
      expect(user.data.firstName).toBeUndefined();
      expect(user.data.lastName).toBeUndefined();
      expect(user.data.primaryEmail).toBeUndefined();
      expect(user.data.identities).toBeUndefined();
      expect(user.data.access).toEqual(access);
      expect(user.data.id.indexOf('usr-')).toBe(0);
    }, 20000);

    test('Adding a user with access should normalize the resource string', async () => {
      const access = { allow: [{ action: '*', resource: '/account/abc' }] };
      const user = await addUser(account, { access });

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

    test('Adding a user with an empty string first name is not supported', async () => {
      const user = await addUser(account, { firstName: '' });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"firstName" is not allowed to be empty');
    }, 20000);

    test('Adding a user with an empty string last name is not supported', async () => {
      const user = await addUser(account, { lastName: '' });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"lastName" is not allowed to be empty');
    }, 20000);

    test('Adding a user with an empty string primary email is not supported', async () => {
      const user = await addUser(account, { primaryEmail: '' });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"primaryEmail" is not allowed to be empty');
    }, 20000);

    test('Adding a user with an exisitng identity returns an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ issuerId: 'test', subject }];
      await addUser(account, { identities });
      const user = await addUser(account, { identities });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe(
        `The identity with issuer 'test' and subject '${subject}' is already associated with a user`
      );
    }, 20000);

    test('Adding a user with an identity with an empty issuerId is not supported', async () => {
      const identities = [{ issuerId: '', subject: `sub-${random()}` }];
      const user = await addUser(account, { identities });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"issuerId" is not allowed to be empty');
    }, 20000);

    test('Adding a user with an identity with a missing issuerId is not supported', async () => {
      const identities = [{ subject: `sub-${random()}` }];
      const user = await addUser(account, { identities });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"issuerId" is required');
    }, 20000);

    test('Adding a user with an identity with an empty subject is not supported', async () => {
      const identities = [{ issuerId: 'foo', subject: '' }];
      const user = await addUser(account, { identities });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"subject" is not allowed to be empty');
    }, 20000);

    test('Adding a user with an identity with a missing subject is not supported', async () => {
      const identities = [{ issuerId: 'foo' }];
      const user = await addUser(account, { identities });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"subject" is required');
    }, 20000);

    test('Adding a user with access with an empty action is not supported', async () => {
      const access = { allow: [{ action: '', resource: '/' }] };
      const user = await addUser(account, { access });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"action" is not allowed to be empty');
    }, 20000);

    test('Adding a user with access with a missing action is not supported', async () => {
      const access = { allow: [{ resource: '/' }] };
      const user = await addUser(account, { access });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"action" is required');
    }, 20000);

    test('Adding a user with access with an empty resource is not supported', async () => {
      const access = { allow: [{ action: '*', resource: '' }] };
      const user = await addUser(account, { access });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"resource" is not allowed to be empty');
    }, 20000);

    test('Adding a user with access with a missing resource is not supported', async () => {
      const access = { allow: [{ action: '*' }] };
      const user = await addUser(account, { access });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"resource" is required');
    }, 20000);

    test('Adding a user with access with no allow is not supported', async () => {
      const access = {};
      const user = await addUser(account, { access });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"allow" is required');
    }, 20000);

    test('Adding a user with access with an empty allow array is not supported', async () => {
      const access = { allow: [] };
      const user = await addUser(account, { access });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"allow" must contain at least 1 items');
    }, 20000);

    test('Adding a user with identities with an empty array is not supported', async () => {
      const identities: any = [];
      const user = await addUser(account, { identities });
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe('"identities" must contain at least 1 items');
    }, 20000);

    test('Adding a user with a non-existing account should return an error', async () => {
      const user = await addUser(invalidAccount, {});
      expect(user.status).toBe(404);
      expect(user.data.status).toBe(404);
      expect(user.data.statusCode).toBe(404);

      const message = user.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 20000);
  });

  describe('List', () => {
    test('Listing all users should return users', async () => {
      await Promise.all([
        addUser(account, {}),
        addUser(account, {}),
        addUser(account, {}),
        addUser(account, {}),
        addUser(account, {}),
      ]);
      const result = await listUsers(account);
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBeGreaterThanOrEqual(5);
    }, 50000);

    test('Listing all users does not return identities and access by default', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const firstName = `first - ${testRunId}`;
      await Promise.all([
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
      ]);
      const result = await listUsers(account, { name: firstName });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.firstName).toBe(firstName);
        expect(item.identities).toBeUndefined();
        expect(item.access).toBeUndefined();
      }
    }, 50000);

    test('Listing all users does return identities and access by default if include=all', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const firstName = `first - ${testRunId}`;
      await Promise.all([
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
      ]);
      const result = await listUsers(account, { name: firstName, include: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.firstName).toBe(firstName);
        expect(item.identities.length).toBe(1);
        expect(item.access).toEqual(access);
      }
    }, 50000);

    test('Listing all users filtered by first name should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { firstName: `${testRunId} - 1a` }),
        addUser(account, { firstName: `${testRunId} - 1b` }),
        addUser(account, { firstName: `${testRunId} - 1c` }),
        addUser(account, { firstName: `${testRunId} - 1d` }),
        addUser(account, { firstName: `${testRunId} - 1e` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 1` });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.firstName.indexOf(`${testRunId} - 1`)).toBe(0);
      }
    }, 50000);

    test('Listing all users filtered by last name should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { lastName: `${testRunId} - 2a` }),
        addUser(account, { lastName: `${testRunId} - 2b` }),
        addUser(account, { lastName: `${testRunId} - 2c` }),
        addUser(account, { lastName: `${testRunId} - 2d` }),
        addUser(account, { lastName: `${testRunId} - 2e` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 2` });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.lastName.indexOf(`${testRunId} - 2`)).toBe(0);
      }
    }, 50000);

    test('Listing all users filtered by first and last name should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { lastName: `${testRunId} - 3a` }),
        addUser(account, { firstName: `${testRunId} - 3b` }),
        addUser(account, { lastName: `${testRunId} - 3c` }),
        addUser(account, { firstName: `${testRunId} - 3d` }),
        addUser(account, { lastName: `${testRunId} - 3e` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 3` });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        if (item.lastName) {
          expect(item.lastName.indexOf(`${testRunId} - 3`)).toBe(0);
        } else {
          expect(item.firstName.indexOf(`${testRunId} - 3`)).toBe(0);
        }
      }
    }, 50000);

    test('Listing all users filtered by email should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { primaryEmail: `${testRunId} - 4a` }),
        addUser(account, { primaryEmail: `${testRunId} - 4b` }),
        addUser(account, { primaryEmail: `${testRunId} - 4c` }),
        addUser(account, { primaryEmail: `${testRunId} - 4d` }),
        addUser(account, { primaryEmail: `${testRunId} - 4e` }),
      ]);
      const result = await listUsers(account, { email: `${testRunId} - 4` });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.primaryEmail.indexOf(`${testRunId} - 4`)).toBe(0);
      }
    }, 50000);

    test('Listing all users filtered by name and email should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { primaryEmail: `${testRunId} - email - 5a`, firstName: `${testRunId} - name - 5a` }),
        addUser(account, { firstName: `${testRunId} - name - 5b` }),
        addUser(account, { primaryEmail: `${testRunId} - email - 5c` }),
        addUser(account, { firstName: `${testRunId} - name - 5d`, primaryEmail: `${testRunId} - email - 5d` }),
        addUser(account, { primaryEmail: `${testRunId} - email - 5e` }),
      ]);
      const result = await listUsers(account, { email: `${testRunId} - email - 5`, name: `${testRunId} - name - 5` });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(2);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.primaryEmail.indexOf(`${testRunId} - email - 5`)).toBe(0);
        expect(item.firstName.indexOf(`${testRunId} - name - 5`)).toBe(0);
      }
    }, 50000);

    test('Listing all users filtered by issuerId should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { identities: [{ issuerId: `${testRunId} - 6a`, subject: `sub-${random()}` }] }),
        addUser(account, { identities: [{ issuerId: `${testRunId} - 6b`, subject: `sub-${random()}` }] }),
        addUser(account, { identities: [{ issuerId: `${testRunId} - 6c`, subject: `sub-${random()}` }] }),
        addUser(account, { identities: [{ issuerId: `${testRunId} - 6d`, subject: `sub-${random()}` }] }),
        addUser(account, { identities: [{ issuerId: `${testRunId} - 6e`, subject: `sub-${random()}` }] }),
      ]);
      const result = await listUsers(account, { issuerId: `${testRunId} - 6`, include: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].issuerId.indexOf(`${testRunId} - 6`)).toBe(0);
      }
    }, 50000);

    test('Listing all users filtered by subject should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { identities: [{ subject: `${testRunId} - 7a`, issuerId: `foo` }] }),
        addUser(account, { identities: [{ subject: `${testRunId} - 7b`, issuerId: `foo` }] }),
        addUser(account, { identities: [{ subject: `${testRunId} - 7c`, issuerId: `foo` }] }),
        addUser(account, { identities: [{ subject: `${testRunId} - 7d`, issuerId: `foo` }] }),
        addUser(account, { identities: [{ subject: `${testRunId} - 7e`, issuerId: `foo` }] }),
      ]);
      const result = await listUsers(account, { subject: `${testRunId} - 7`, include: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].subject.indexOf(`${testRunId} - 7`)).toBe(0);
      }
    }, 50000);

    test('Listing all users filtered by first name should return only exact matches if exact=true', async () => {
      await Promise.all([
        addUser(account, { firstName: `${testRunId} - 8` }),
        addUser(account, { firstName: `${testRunId} - 8a` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 8`, exact: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.firstName).toBe(`${testRunId} - 8`);
      }
    }, 50000);

    test('Listing all users filtered by last name should return only exact matches if exact=true', async () => {
      await Promise.all([
        addUser(account, { lastName: `${testRunId} - 9` }),
        addUser(account, { lastName: `${testRunId} - 9a` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 9`, exact: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.lastName).toBe(`${testRunId} - 9`);
      }
    }, 50000);

    test('Listing all users filtered by email should return only exact matches if exact=true', async () => {
      await Promise.all([
        addUser(account, { primaryEmail: `${testRunId} - 10` }),
        addUser(account, { primaryEmail: `${testRunId} - 10a` }),
      ]);
      const result = await listUsers(account, { email: `${testRunId} - 10`, exact: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.primaryEmail).toBe(`${testRunId} - 10`);
      }
    }, 50000);

    test('Listing all users filtered by issuerId should return only exact matches if exact=true', async () => {
      await Promise.all([
        addUser(account, { identities: [{ issuerId: `${testRunId} - 11`, subject: `sub-${random()}` }] }),
        addUser(account, { identities: [{ issuerId: `${testRunId} - 11a`, subject: `sub-${random()}` }] }),
      ]);
      const result = await listUsers(account, { issuerId: `${testRunId} - 11`, include: true, exact: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].issuerId).toBe(`${testRunId} - 11`);
      }
    }, 50000);

    test('Listing all users filtered by subject should return only exact matches if exact=true', async () => {
      await Promise.all([
        addUser(account, { identities: [{ subject: `${testRunId} - 12`, issuerId: `foo` }] }),
        addUser(account, { identities: [{ subject: `${testRunId} - 12a`, issuerId: `foo` }] }),
      ]);
      const result = await listUsers(account, { subject: `${testRunId} - 12`, include: true, exact: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].subject).toBe(`${testRunId} - 12`);
      }
    }, 50000);

    test('Listing all users filtered by issuerId and subject should return only exact matches if exact=true', async () => {
      await Promise.all([
        addUser(account, { identities: [{ subject: `${testRunId} - 12`, issuerId: `foo` }] }),
        addUser(account, { identities: [{ subject: `${testRunId} - 12a`, issuerId: `foo` }] }),
        addUser(account, { identities: [{ subject: `${testRunId} - 12`, issuerId: `foo2` }] }),
        addUser(account, { identities: [{ subject: `${testRunId} - 12a`, issuerId: `foo2` }] }),
      ]);
      const result = await listUsers(account, {
        subject: `${testRunId} - 12`,
        issuerId: 'foo',
        include: true,
        exact: true,
      });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].subject).toBe(`${testRunId} - 12`);
        expect(item.identities[0].issuerId).toBe('foo');
      }
    }, 50000);

    test('Listing all users with a count and next should work', async () => {
      const userId = `test-${random()}`;
      await Promise.all([
        addUser(account, { firstName: `${testRunId} - 13a` }),
        addUser(account, { firstName: `${testRunId} - 13b` }),
        addUser(account, { firstName: `${testRunId} - 13c` }),
        addUser(account, { firstName: `${testRunId} - 13d` }),
        addUser(account, { firstName: `${testRunId} - 13e` }),
      ]);
      const result1 = await listUsers(account, { name: `${testRunId} - 13`, count: 3 });
      expect(result1.status).toBe(200);
      expect(result1.data.items.length).toBe(3);
      expect(result1.data.next).toBeDefined();

      const result2 = await listUsers(account, { name: `${testRunId} - 13`, next: result1.data.next });
      expect(result2.status).toBe(200);
      expect(result2.data.items.length).toBe(2);
      expect(result2.data.next).toBeUndefined();

      const items = [...result1.data.items, ...result2.data.items];

      const lookup: any = {};
      for (const item of items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.firstName.indexOf(`${testRunId} - 13`)).toBe(0);
      }
    }, 50000);

    test('Listing all users with a count of 0 should use default count', async () => {
      await Promise.all([
        addUser(account, { lastName: `${testRunId} - 14a` }),
        addUser(account, { lastName: `${testRunId} - 14b` }),
        addUser(account, { lastName: `${testRunId} - 14c` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 14`, count: 0 });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.lastName.indexOf(`${testRunId} - 14`)).toBe(0);
      }
    }, 50000);

    test('Listing all users with a negative count should return an error', async () => {
      const result = await listUsers(account, { count: -5 });
      expect(result.status).toBe(400);
      expect(result.data.status).toBe(400);
      expect(result.data.statusCode).toBe(400);
      expect(result.data.message).toBe("The limit value '-5' is invalid; must be a positive number");
    }, 10000);

    test('Listing all users with an overly large count should use default max count', async () => {
      await Promise.all([
        addUser(account, { lastName: `${testRunId} - 15a` }),
        addUser(account, { lastName: `${testRunId} - 15b` }),
        addUser(account, { lastName: `${testRunId} - 15c` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 15`, count: 5000 });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.lastName.indexOf(`${testRunId} - 15`)).toBe(0);
      }
    }, 50000);

    test('Listing users with a non-existing account should return an error', async () => {
      const user = await listUsers(invalidAccount);
      expect(user.status).toBe(404);
      expect(user.data.status).toBe(404);
      expect(user.data.statusCode).toBe(404);

      const message = user.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 20000);
  });

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
    }, 20000);

    test('Getting a user with an invalid user id should return an error', async () => {
      const userId = `usr-${random()}`;
      const user = await getUser(account, userId);
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe(
        `"userId" with value "${userId}" fails to match the required pattern: /^usr-[a-g0-9]{16}$/`
      );
    }, 20000);

    test('Getting a non-existing user should return an error', async () => {
      const userId = `usr-${random({ lengthInBytes: 8 })}`;
      const user = await getUser(account, userId);
      expect(user.status).toBe(404);
      expect(user.data.status).toBe(404);
      expect(user.data.statusCode).toBe(404);
      expect(user.data.message).toBe(`The user '${userId}' does not exist`);
    }, 20000);

    test('Getting an user with a non-existing account should return an error', async () => {
      const original = await addUser(account, {});
      const user = await getUser(invalidAccount, original.data.id);
      expect(user.status).toBe(404);
      expect(user.data.status).toBe(404);
      expect(user.data.statusCode).toBe(404);

      const message = user.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 10000);
  });

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
