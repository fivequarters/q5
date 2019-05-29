import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addClient, listClients, cleanUpClients } from './sdk';
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
  await cleanUpClients(account);
}, 20000);

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
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBeGreaterThanOrEqual(5);
    }, 50000);

    test('Listing all clients does not return identities and access by default', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const displayName = `display - ${testRunId}`;
      await Promise.all([
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
      ]);
      const result = await listClients(account, { name: displayName });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName).toBe(displayName);
        expect(item.identities).toBeUndefined();
        expect(item.access).toBeUndefined();
      }
    }, 50000);

    test('Listing all clients does return identities and access by default if include=all', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const displayName = `display - ${testRunId}`;
      await Promise.all([
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
        addClient(account, { displayName, access, identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] }),
      ]);
      const result = await listClients(account, { name: displayName, include: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName).toBe(displayName);
        expect(item.identities.length).toBe(1);
        expect(item.access).toEqual(access);
      }
    }, 50000);

    test('Listing all clients filtered by display name should return only filtered clients', async () => {
      await Promise.all([
        addClient(account, { displayName: `${testRunId} - 1a` }),
        addClient(account, { displayName: `${testRunId} - 1b` }),
        addClient(account, { displayName: `${testRunId} - 1c` }),
        addClient(account, { displayName: `${testRunId} - 1d` }),
        addClient(account, { displayName: `${testRunId} - 1e` }),
      ]);
      const result = await listClients(account, { name: `${testRunId} - 1` });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName.indexOf(`${testRunId} - 1`)).toBe(0);
      }
    }, 50000);

    test('Listing all clients filtered by issuerId should return only filtered clients', async () => {
      await Promise.all([
        addClient(account, { identities: [{ issuerId: `${testRunId} - 6a`, subject: `sub-${random()}` }] }),
        addClient(account, { identities: [{ issuerId: `${testRunId} - 6b`, subject: `sub-${random()}` }] }),
        addClient(account, { identities: [{ issuerId: `${testRunId} - 6c`, subject: `sub-${random()}` }] }),
        addClient(account, { identities: [{ issuerId: `${testRunId} - 6d`, subject: `sub-${random()}` }] }),
        addClient(account, { identities: [{ issuerId: `${testRunId} - 6e`, subject: `sub-${random()}` }] }),
      ]);
      const result = await listClients(account, { issuerId: `${testRunId} - 6`, include: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].issuerId.indexOf(`${testRunId} - 6`)).toBe(0);
      }
    }, 50000);

    test('Listing all clients filtered by subject should return only filtered clients', async () => {
      await Promise.all([
        addClient(account, { identities: [{ subject: `${testRunId} - 7a`, issuerId: `foo` }] }),
        addClient(account, { identities: [{ subject: `${testRunId} - 7b`, issuerId: `foo` }] }),
        addClient(account, { identities: [{ subject: `${testRunId} - 7c`, issuerId: `foo` }] }),
        addClient(account, { identities: [{ subject: `${testRunId} - 7d`, issuerId: `foo` }] }),
        addClient(account, { identities: [{ subject: `${testRunId} - 7e`, issuerId: `foo` }] }),
      ]);
      const result = await listClients(account, { subject: `${testRunId} - 7`, include: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].subject.indexOf(`${testRunId} - 7`)).toBe(0);
      }
    }, 50000);

    test('Listing all clients filtered by display name should return only exact matches if exact=true', async () => {
      await Promise.all([
        addClient(account, { displayName: `${testRunId} - 8` }),
        addClient(account, { displayName: `${testRunId} - 8a` }),
      ]);
      const result = await listClients(account, { name: `${testRunId} - 8`, exact: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName).toBe(`${testRunId} - 8`);
      }
    }, 50000);

    test('Listing all clients filtered by issuerId should return only exact matches if exact=true', async () => {
      await Promise.all([
        addClient(account, { identities: [{ issuerId: `${testRunId} - 11`, subject: `sub-${random()}` }] }),
        addClient(account, { identities: [{ issuerId: `${testRunId} - 11a`, subject: `sub-${random()}` }] }),
      ]);
      const result = await listClients(account, { issuerId: `${testRunId} - 11`, include: true, exact: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].issuerId).toBe(`${testRunId} - 11`);
      }
    }, 50000);

    test('Listing all clients filtered by subject should return only exact matches if exact=true', async () => {
      await Promise.all([
        addClient(account, { identities: [{ subject: `${testRunId} - 12`, issuerId: `foo` }] }),
        addClient(account, { identities: [{ subject: `${testRunId} - 12a`, issuerId: `foo` }] }),
      ]);
      const result = await listClients(account, { subject: `${testRunId} - 12`, include: true, exact: true });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(1);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.identities[0].subject).toBe(`${testRunId} - 12`);
      }
    }, 50000);

    test('Listing all clients filtered by issuerId and subject should return only exact matches if exact=true', async () => {
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
      expect(result1.status).toBe(200);
      expect(result1.data.items.length).toBe(3);
      expect(result1.data.next).toBeDefined();

      const result2 = await listClients(account, { name: `${testRunId} - 13`, next: result1.data.next });
      expect(result2.status).toBe(200);
      expect(result2.data.items.length).toBe(2);
      expect(result2.data.next).toBeUndefined();

      const items = [...result1.data.items, ...result2.data.items];

      const lookup: any = {};
      for (const item of items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName.indexOf(`${testRunId} - 13`)).toBe(0);
      }
    }, 50000);

    test('Listing all clients with a count of 0 should use default count', async () => {
      await Promise.all([
        addClient(account, { displayName: `${testRunId} - 14a` }),
        addClient(account, { displayName: `${testRunId} - 14b` }),
        addClient(account, { displayName: `${testRunId} - 14c` }),
      ]);
      const result = await listClients(account, { name: `${testRunId} - 14`, count: 0 });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName.indexOf(`${testRunId} - 14`)).toBe(0);
      }
    }, 50000);

    test('Listing all clients with a negative count should return an error', async () => {
      const result = await listClients(account, { count: -5 });
      expect(result.status).toBe(400);
      expect(result.data.status).toBe(400);
      expect(result.data.statusCode).toBe(400);
      expect(result.data.message).toBe("The limit value '-5' is invalid; must be a positive number");
    }, 10000);

    test('Listing all clients with an overly large count should use default max count', async () => {
      await Promise.all([
        addClient(account, { displayName: `${testRunId} - 15a` }),
        addClient(account, { displayName: `${testRunId} - 15b` }),
        addClient(account, { displayName: `${testRunId} - 15c` }),
      ]);
      const result = await listClients(account, { name: `${testRunId} - 15`, count: 5000 });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.displayName.indexOf(`${testRunId} - 15`)).toBe(0);
      }
    }, 50000);

    test('Listing clients with a non-existing account should return an error', async () => {
      const client = await listClients(invalidAccount);
      expect(client.status).toBe(404);
      expect(client.data.status).toBe(404);
      expect(client.data.statusCode).toBe(404);

      const message = client.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 20000);
  });
});
