import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { setStorage, listStorage, cleanUpStorage } from './sdk';
import { extendExpect } from './extendJest';

const expectMore = extendExpect(expect);

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpStorage(account);
}, 10000);

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
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBeGreaterThanOrEqual(5);
    }, 20000);

    test('Listing storage with a count and next should work', async () => {
      await Promise.all([
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
        setStorage(account, `test-${random()}`, { data: 'hello world' }),
      ]);

      const result = await listStorage(account, { count: 3 });
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeDefined();

      const resultNext = await listStorage(account, { next: result.data.next });
      expect(resultNext.status).toBe(200);
      expect(resultNext.data.items.length).toBeGreaterThanOrEqual(2);
    }, 20000);

    test('Getting storage with a malformed account id should return an error', async () => {
      const malformed = await getMalformedAccount();
      const storage = await listStorage(malformed);
      expectMore(storage).toBeMalformedAccountError(malformed.accountId);
    }, 10000);

    test('Getting storage with a non-existing account should return an error', async () => {
      const storage = await listStorage(await getNonExistingAccount());
      expectMore(storage).toBeUnauthorizedError();
    }, 10000);
  });
});
