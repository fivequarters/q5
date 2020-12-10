import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { setStorage, listStorage, cleanUpStorage } from './sdk';
import './extendJest';

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpStorage(account);
}, 180000);

describe('Storage', () => {
  describe('List', () => {
    test('Listing storage should work', async () => {
      await Promise.all([
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
      ]);
      const result = await listStorage(account);
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBeGreaterThanOrEqual(5);
    }, 180000);

    test('Listing storage with hierarchy from root should work', async () => {
      const storageIdPrefix = `test-${random()}`;
      await Promise.all([
        setStorage(account, `${storageIdPrefix}`, { data: 'hello world' }),
        setStorage(account, `${storageIdPrefix}/foo`, { data: 'hello world' }),
        setStorage(account, `${storageIdPrefix}/bar`, { data: 'hello world' }),
        setStorage(account, `${storageIdPrefix}/foo/bar`, { data: 'hello world' }),
      ]);
      const result = await listStorage(account);
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBeGreaterThanOrEqual(3);
    }, 180000);

    test('Listing storage with hierarchy from storageId should work', async () => {
      const storageIdPrefix = `test-${random()}`;
      await Promise.all([
        setStorage(account, `${storageIdPrefix}`, { data: 'hello world' }),
        setStorage(account, `${storageIdPrefix}/foo`, { data: 'hello world' }),
        setStorage(account, `${storageIdPrefix}/bar`, { data: 'hello world' }),
        setStorage(account, `${storageIdPrefix}/foo/bar`, { data: 'hello world' }),
      ]);
      let result = await listStorage(account, { storageId: `${storageIdPrefix}/*` });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      result = await listStorage(account, { storageId: `${storageIdPrefix}/*/` });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
    }, 180000);

    test('Listing storage with hierarchy from storageId with funky characters should work', async () => {
      const storageIdPrefix = `test-${random()}`;
      const storageIds = [
        `${storageIdPrefix}`,
        `${storageIdPrefix}/fo!@$^&(){}-"':;<>o`,
        `${storageIdPrefix}/bar`,
        `${storageIdPrefix}/foo/bar`,
      ];
      await Promise.all(storageIds.map((s) => setStorage(account, s, { data: 'hello world' })));
      const result = await listStorage(account, { storageId: `${storageIdPrefix}/*` });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      storageIds.shift();
      result.data.items.forEach((i: any) => {
        const index = storageIds.indexOf(i.storageId);
        expect(index).toBeGreaterThanOrEqual(0);
        storageIds.splice(index, 1);
      });
      expect(storageIds.length).toBe(0);
    }, 180000);

    test('Listing storage with a count and next should work', async () => {
      await Promise.all([
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
      ]);

      const result = await listStorage(account, { count: 3 });
      expect(result).toBeHttp({ statusCode: 200 });
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeDefined();

      const resultNext = await listStorage(account, { next: result.data.next });
      expect(resultNext).toBeHttp({ statusCode: 200 });
      expect(resultNext.data.items.length).toBeGreaterThanOrEqual(2);
    }, 180000);

    test('Getting storage with a malformed account id should return an error', async () => {
      const malformed = await getMalformedAccount();
      const storage = await listStorage(malformed);
      expect(storage).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Getting storage with a non-existing account should return an error', async () => {
      const storage = await listStorage(await getNonExistingAccount());
      expect(storage).toBeUnauthorizedError();
    }, 180000);
  });
});
