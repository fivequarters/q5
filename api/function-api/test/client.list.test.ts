import { random } from '@5qtrs/random';

import { getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addClient, listClients, cleanUpClients } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

let testRunId: string = '00000';

beforeAll(() => {
  testRunId = random() as string;
});

afterEach(async () => {
  await cleanUpClients(account);
}, 180000);

describe('Client', () => {
  describe('List', () => {
    test('Listing all clients should return clients', async () => {
      await Promise.all([
        addClient(account, {}),
        addClient(account, {}),
        addClient(account, {}),
        addClient(account, {}),
        addClient(account, {}),
      ]);
      const result = await listClients(account);
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBeGreaterThanOrEqual(5);
    }, 180000);

    test('Listing all clients does not return identities and access by default', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const displayName = `display - ${testRunId}`;
      await Promise.all([
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
      ]);
      const result = await listClients(account, { name: displayName });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName).toBe(displayName);
        expect(item.identities).toBeUndefined();
        expect(item.access).toBeUndefined();
      }
    }, 180000);

    test('Listing all clients does return identities and access by default if include=all', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const displayName = `display - ${testRunId}`;
      await Promise.all([
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
      ]);
      const result = await listClients(account, { name: displayName, include: true });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName).toBe(displayName);
        expect(item.identities.length).toBe(1);
        expect(item.access).toEqual(access);
      }
    }, 180000);

    test('Listing all clients filtered by display name should return only filtered clients', async () => {
      await Promise.all([
        addClient(account, { displayName: `${testRunId} - 1a` }),
        addClient(account, { displayName: `${testRunId} - 1b` }),
        addClient(account, { displayName: `${testRunId} - 1c` }),
        addClient(account, { displayName: `${testRunId} - 1d` }),
        addClient(account, { displayName: `${testRunId} - 1e` }),
      ]);
      const result = await listClients(account, { name: `${testRunId} - 1` });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName.indexOf(`${testRunId} - 1`)).toBe(0);
      }
    }, 180000);

    test('Listing all clients filtered by issuerId should return only exact matches', async () => {
      await Promise.all([
        addClient(account, { identities: [{ issuerId: `${testRunId} - 11`, subject: `sub-${random()}` }] }),
        addClient(account, { identities: [{ issuerId: `${testRunId} - 11a`, subject: `sub-${random()}` }] }),
      ]);
      const result = await listClients(account, { issuerId: `${testRunId} - 11`, include: true });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].issuerId).toBe(`${testRunId} - 11`);
      }
    }, 180000);

    test('Listing all clients filtered by issuerId and subject should return only exact matches', async () => {
      await Promise.all([
        addClient(account, { identities: [{ subject: `${testRunId} - 12`, issuerId: `foo` }] }),
        addClient(account, { identities: [{ subject: `${testRunId} - 12a`, issuerId: `foo` }] }),
        addClient(account, { identities: [{ subject: `${testRunId} - 12`, issuerId: `foo2` }] }),
        addClient(account, { identities: [{ subject: `${testRunId} - 12a`, issuerId: `foo2` }] }),
      ]);
      const result = await listClients(account, {
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

    test('Listing all clients with a count and next should work', async () => {
      const clientId = `test-${random()}`;
      await Promise.all([
        addClient(account, { displayName: `${testRunId} - 13a` }),
        addClient(account, { displayName: `${testRunId} - 13b` }),
        addClient(account, { displayName: `${testRunId} - 13c` }),
        addClient(account, { displayName: `${testRunId} - 13d` }),
        addClient(account, { displayName: `${testRunId} - 13e` }),
      ]);
      const result1 = await listClients(account, { name: `${testRunId} - 13`, count: 3 });
      expect(result1).toBeHttp({ statusCode: 200 });
      expect(result1.data.items.length).toBe(3);
      expect(result1.data.next).toBeDefined();

      const result2 = await listClients(account, { name: `${testRunId} - 13`, next: result1.data.next });
      expect(result2).toBeHttp({ statusCode: 200 });
      expect(result2.data.items.length).toBe(2);
      expect(result2.data.next).toBeUndefined();

      const items = [...result1.data.items, ...result2.data.items];

      const lookup: any = {};
      for (const item of items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName.indexOf(`${testRunId} - 13`)).toBe(0);
      }
    }, 180000);

    test('Listing all clients with a count of 0 should use default count', async () => {
      await Promise.all([
        addClient(account, { displayName: `${testRunId} - 14a` }),
        addClient(account, { displayName: `${testRunId} - 14b` }),
        addClient(account, { displayName: `${testRunId} - 14c` }),
      ]);
      const result = await listClients(account, { name: `${testRunId} - 14`, count: 0 });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName.indexOf(`${testRunId} - 14`)).toBe(0);
      }
    }, 180000);

    test('Listing all clients with a negative count should return an error', async () => {
      const result = await listClients(account, { count: -5 });
      expect(result).toBeHttpError(400, "The limit value '-5' is invalid; must be a positive number");
    }, 180000);

    test('Listing all clients with an overly large count should use default max count', async () => {
      await Promise.all([
        addClient(account, { displayName: `${testRunId} - 15a` }),
        addClient(account, { displayName: `${testRunId} - 15b` }),
        addClient(account, { displayName: `${testRunId} - 15c` }),
      ]);
      const result = await listClients(account, { name: `${testRunId} - 15`, count: 5000 });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName.indexOf(`${testRunId} - 15`)).toBe(0);
      }
    }, 180000);

    test('Listing all clients filtered by subject without issuerId should return an error', async () => {
      await Promise.all([
        addClient(account, { identities: [{ subject: `${testRunId} - 7`, issuerId: `foo` }] }),
        addClient(account, { identities: [{ subject: `${testRunId} - 7`, issuerId: `foo2` }] }),
      ]);
      const result = await listClients(account, { subject: `${testRunId} - 7`, include: true });
      expect(result).toBeHttpError(
        400,
        `The 'subject' filter '${testRunId} - 7' can not be specified without the 'issuerId' filter`
      );
    }, 180000);

    test('Listing clients with a malformed account should return an error', async () => {
      const malformed = await getMalformedAccount();
      const client = await listClients(malformed);
      expect(client).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Listing clients with a non-existing account should return an error', async () => {
      const client = await listClients(await getNonExistingAccount());
      expect(client).toBeUnauthorizedError();
    }, 180000);
  });
});
