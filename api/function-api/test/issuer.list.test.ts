import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addIssuer, listIssuers, cleanUpIssuers } from './sdk';
import { extendExpect } from './extendJest';

const expectMore = extendExpect(expect);

let account: IAccount = FakeAccount;
let testRunId: string = '00000';

beforeAll(async () => {
  account = await resolveAccount();
  testRunId = random() as string;
});

afterEach(async () => {
  await cleanUpIssuers(account);
}, 10000);

describe('Issuer', () => {
  describe('List', () => {
    test('Listing all issuers should return issuers', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-1a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 1a` }),
        addIssuer(account, `${issuerId}-1b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 1b` }),
        addIssuer(account, `${issuerId}-1c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 1c` }),
        addIssuer(account, `${issuerId}-1d`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 1d` }),
        addIssuer(account, `${issuerId}-1e`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 1e` }),
      ]);
      const result = await listIssuers(account);
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBeGreaterThanOrEqual(5);
    }, 10000);

    test('Listing all issuers filtered by name should return only filtered issuers', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-2a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 2a` }),
        addIssuer(account, `${issuerId}-2b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 2b` }),
        addIssuer(account, `${issuerId}-2c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 2c` }),
        addIssuer(account, `${issuerId}-2d`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 2d` }),
        addIssuer(account, `${issuerId}-2e`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 2e` }),
      ]);
      const result = await listIssuers(account, undefined, undefined, `${testRunId} - 2`);
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.jsonKeysUrl).toBe('foo');
        expect(item.displayName.indexOf(`test: ${testRunId} - 2`)).toBe(0);
        expect(item.id.indexOf(`${issuerId}-2`)).toBe(0);
      }
    }, 10000);

    test('Listing all issuers with a count and next should work', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-3a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 3a` }),
        addIssuer(account, `${issuerId}-3b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 3b` }),
        addIssuer(account, `${issuerId}-3c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 3c` }),
        addIssuer(account, `${issuerId}-3d`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 3d` }),
        addIssuer(account, `${issuerId}-3e`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 3e` }),
      ]);
      const result1 = await listIssuers(account, 3, undefined, `${testRunId} - 3`);
      expect(result1.status).toBe(200);
      expect(result1.data.items.length).toBe(3);
      expect(result1.data.next).toBeDefined();

      const result2 = await listIssuers(account, undefined, result1.data.next, `${testRunId} - 3`);
      expect(result2.status).toBe(200);
      expect(result2.data.items.length).toBe(2);
      expect(result2.data.next).toBeUndefined();

      const items = [...result1.data.items, ...result2.data.items];

      const lookup: any = {};
      for (const item of items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;

        expect(item.jsonKeysUrl).toBe('foo');
        expect(item.displayName.indexOf(`test: ${testRunId} - 3`)).toBe(0);
        expect(item.id.indexOf(`${issuerId}-3`)).toBe(0);
      }
    }, 30000);

    test('Listing all issuers with a count of 1 and next should work', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-4a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 4a` }),
        addIssuer(account, `${issuerId}-4b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 4b` }),
        addIssuer(account, `${issuerId}-4c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 4c` }),
      ]);
      const result1 = await listIssuers(account, 1, undefined, `${testRunId} - 4`);
      expect(result1.status).toBe(200);
      expect(result1.data.items.length).toBe(1);
      expect(result1.data.next).toBeDefined();

      const result2 = await listIssuers(account, 1, result1.data.next, `${testRunId} - 4`);
      expect(result2.status).toBe(200);
      expect(result2.data.items.length).toBe(1);
      expect(result2.data.next).toBeDefined();

      const result3 = await listIssuers(account, 1, result2.data.next, `${testRunId} - 4`);
      expect(result3.status).toBe(200);
      expect(result3.data.items.length).toBe(1);
      expect(result3.data.next).toBeUndefined();

      const items = [...result1.data.items, ...result2.data.items, ...result3.data.items];

      const lookup: any = {};
      for (const item of items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;

        expect(item.jsonKeysUrl).toBe('foo');
        expect(item.displayName.indexOf(`test: ${testRunId} - 4`)).toBe(0);
        expect(item.id.indexOf(`${issuerId}-4`)).toBe(0);
      }
    }, 50000);

    test('Listing all issuers with a count of 0 should use default count', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-5a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5a` }),
        addIssuer(account, `${issuerId}-5b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5b` }),
        addIssuer(account, `${issuerId}-5c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5c` }),
      ]);
      const result = await listIssuers(account, 0, undefined, `${testRunId} - 5`);
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;

        expect(item.jsonKeysUrl).toBe('foo');
        expect(item.displayName.indexOf(`test: ${testRunId} - 5`)).toBe(0);
        expect(item.id.indexOf(`${issuerId}-5`)).toBe(0);
      }
    }, 10000);

    test('Listing all issuers with a negative count should return an error', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-5a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5a` }),
        addIssuer(account, `${issuerId}-5b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5b` }),
        addIssuer(account, `${issuerId}-5c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5c` }),
      ]);
      const result = await listIssuers(account, -5, undefined, `${testRunId} - 5`);
      expect(result.status).toBe(400);
      expect(result.data.status).toBe(400);
      expect(result.data.statusCode).toBe(400);
      expect(result.data.message).toBe("The limit value '-5' is invalid; must be a positive number");
    }, 10000);

    test('Listing all issuers with an overly large count should use default max count', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-6a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 6a` }),
        addIssuer(account, `${issuerId}-6b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 6b` }),
        addIssuer(account, `${issuerId}-6c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 6c` }),
      ]);
      const result = await listIssuers(account, 50000, undefined, `${testRunId} - 6`);
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;

        expect(item.jsonKeysUrl).toBe('foo');
        expect(item.displayName.indexOf(`test: ${testRunId} - 6`)).toBe(0);
        expect(item.id.indexOf(`${issuerId}-6`)).toBe(0);
      }
    }, 10000);

    test('Listing issuers with a malformed account should return an error', async () => {
      const malformed = await getMalformedAccount();
      const issuer = await listIssuers(malformed);
      expectMore(issuer).toBeMalformedAccountError(malformed.accountId);
    }, 10000);

    test('Listing issuers with a non-existing account should return an error', async () => {
      const issuer = await listIssuers(await getNonExistingAccount());
      expectMore(issuer).toBeUnauthorizedError();
    }, 10000);
  });
});
