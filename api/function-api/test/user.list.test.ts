import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addUser, listUsers, cleanUpUsers } from './sdk';
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
});
