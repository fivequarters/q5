import { random } from '@5qtrs/random';

import { getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addUser, listUsers, cleanUpUsers } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

let testRunId: string = '00000';

beforeAll(async () => {
  testRunId = random() as string;
});

afterEach(async () => {
  await cleanUpUsers(account);
}, 180000);

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
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBeGreaterThanOrEqual(5);
    }, 180000);

    test('Listing all users does not return identities and access by default', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const firstName = `first - ${testRunId}`;
      await Promise.all([
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
      ]);
      const result = await listUsers(account, { name: firstName });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.firstName).toBe(firstName);
        expect(item.identities).toBeUndefined();
        expect(item.access).toBeUndefined();
      }
    }, 180000);

    test('Listing all users does return identities and access if include=all', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const firstName = `first - ${testRunId}`;
      await Promise.all([
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addUser(account, { firstName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
      ]);
      const result = await listUsers(account, { name: firstName, include: true });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.firstName).toBe(firstName);
        expect(item.identities.length).toBe(1);
        expect(item.access).toEqual(access);
      }
    }, 180000);

    test('Listing all users filtered by first name should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { firstName: `${testRunId} - 1a` }),
        addUser(account, { firstName: `${testRunId} - 1b` }),
        addUser(account, { firstName: `${testRunId} - 1c` }),
        addUser(account, { firstName: `${testRunId} - 1d` }),
        addUser(account, { firstName: `${testRunId} - 1e` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 1` });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.firstName.indexOf(`${testRunId} - 1`)).toBe(0);
      }
    }, 180000);

    test('Listing all users filtered by last name should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { lastName: `${testRunId} - 2a` }),
        addUser(account, { lastName: `${testRunId} - 2b` }),
        addUser(account, { lastName: `${testRunId} - 2c` }),
        addUser(account, { lastName: `${testRunId} - 2d` }),
        addUser(account, { lastName: `${testRunId} - 2e` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 2` });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.lastName.indexOf(`${testRunId} - 2`)).toBe(0);
      }
    }, 180000);

    test('Listing all users filtered by first and last name should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { lastName: `${testRunId} - 3a` }),
        addUser(account, { firstName: `${testRunId} - 3b` }),
        addUser(account, { lastName: `${testRunId} - 3c` }),
        addUser(account, { firstName: `${testRunId} - 3d` }),
        addUser(account, { lastName: `${testRunId} - 3e` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 3` });
      expect(result).toBeHttp({ statusCode: 200 });
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
    }, 180000);

    test('Listing all users filtered by email should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { primaryEmail: `${testRunId} - 4a` }),
        addUser(account, { primaryEmail: `${testRunId} - 4b` }),
        addUser(account, { primaryEmail: `${testRunId} - 4c` }),
        addUser(account, { primaryEmail: `${testRunId} - 4d` }),
        addUser(account, { primaryEmail: `${testRunId} - 4e` }),
      ]);
      const result = await listUsers(account, { email: `${testRunId} - 4` });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.primaryEmail.indexOf(`${testRunId} - 4`)).toBe(0);
      }
    }, 180000);

    test('Listing all users filtered by name and email should return only filtered users', async () => {
      await Promise.all([
        addUser(account, { primaryEmail: `${testRunId} - email - 5a`, firstName: `${testRunId} - name - 5a` }),
        addUser(account, { firstName: `${testRunId} - name - 5b` }),
        addUser(account, { primaryEmail: `${testRunId} - email - 5c` }),
        addUser(account, { firstName: `${testRunId} - name - 5d`, primaryEmail: `${testRunId} - email - 5d` }),
        addUser(account, { primaryEmail: `${testRunId} - email - 5e` }),
      ]);
      const result = await listUsers(account, { email: `${testRunId} - email - 5`, name: `${testRunId} - name - 5` });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(2);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.primaryEmail.indexOf(`${testRunId} - email - 5`)).toBe(0);
        expect(item.firstName.indexOf(`${testRunId} - name - 5`)).toBe(0);
      }
    }, 180000);

    test('Listing all users filtered by issuerId should return only exact matches', async () => {
      await Promise.all([
        addUser(account, { identities: [{ issuerId: `${testRunId} - 11`, subject: `sub-${random()}` }] }),
        addUser(account, { identities: [{ issuerId: `${testRunId} - 11a`, subject: `sub-${random()}` }] }),
      ]);
      const result = await listUsers(account, { issuerId: `${testRunId} - 11`, include: true });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].issuerId).toBe(`${testRunId} - 11`);
      }
    }, 180000);

    test('Listing all users filtered by issuerId and subject should return only exact matches', async () => {
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
      });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].subject).toBe(`${testRunId} - 12`);
        expect(item.identities[0].issuerId).toBe('foo');
      }
    }, 180000);

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
      expect(result1).toBeHttp({ statusCode: 200 });
      expect(result1.data.items.length).toBe(3);
      expect(result1.data.next).toBeDefined();

      const result2 = await listUsers(account, { name: `${testRunId} - 13`, next: result1.data.next });
      expect(result2).toBeHttp({ statusCode: 200 });
      expect(result2.data.items.length).toBe(2);
      expect(result2.data.next).toBeUndefined();

      const items = [...result1.data.items, ...result2.data.items];

      const lookup: any = {};
      for (const item of items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.firstName.indexOf(`${testRunId} - 13`)).toBe(0);
      }
    }, 180000);

    test('Listing all users with a count of 0 should use default count', async () => {
      await Promise.all([
        addUser(account, { lastName: `${testRunId} - 14a` }),
        addUser(account, { lastName: `${testRunId} - 14b` }),
        addUser(account, { lastName: `${testRunId} - 14c` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 14`, count: 0 });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.lastName.indexOf(`${testRunId} - 14`)).toBe(0);
      }
    }, 180000);

    test('Listing all users with a negative count should return an error', async () => {
      const result = await listUsers(account, { count: -5 });
      expect(result).toBeHttpError(400, "The limit value '-5' is invalid; must be a positive number");
    }, 180000);

    test('Listing all users with an overly large count should use default max count', async () => {
      await Promise.all([
        addUser(account, { lastName: `${testRunId} - 15a` }),
        addUser(account, { lastName: `${testRunId} - 15b` }),
        addUser(account, { lastName: `${testRunId} - 15c` }),
      ]);
      const result = await listUsers(account, { name: `${testRunId} - 15`, count: 5000 });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.lastName.indexOf(`${testRunId} - 15`)).toBe(0);
      }
    }, 180000);

    test('Listing all users filtered by subject without issuerId should return an error', async () => {
      await Promise.all([
        addUser(account, { identities: [{ subject: `${testRunId} - 7`, issuerId: `foo` }] }),
        addUser(account, { identities: [{ subject: `${testRunId} - 7`, issuerId: `foo2` }] }),
      ]);
      const result = await listUsers(account, { subject: `${testRunId} - 7`, include: true });
      expect(result).toBeHttpError(
        400,
        `The 'subject' filter '${testRunId} - 7' can not be specified without the 'issuerId' filter`
      );
    }, 180000);

    test('Listing users with a malformed account should return an error', async () => {
      const malformed = await getMalformedAccount();
      const user = await listUsers(malformed);
      expect(user).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Listing users with a non-existing account should return an error', async () => {
      const user = await listUsers(await getNonExistingAccount());
      expect(user).toBeUnauthorizedError();
    }, 180000);
  });
});
