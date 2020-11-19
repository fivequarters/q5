import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { setStorage, getStorage, cleanUpStorage } from './sdk';
import { extendExpect } from './extendJest';

const expectMore = extendExpect(expect);

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpStorage(account);
}, 180000);

describe('Storage', () => {
  describe('Get', () => {
    test('Getting storage with no storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);

      const retrievedStorage = await getStorage(account, storageId);
      expect(retrievedStorage.status).toBe(200);
      expect(retrievedStorage.headers.etag).toBe('W/"9c05511a31375a8a278a75207331bb1714e69dd1"');
      expect(retrievedStorage.data).toEqual({ etag: '9c05511a31375a8a278a75207331bb1714e69dd1', data: 'hello world' });
    }, 180000);

    test('Getting storage with hierarchy should work', async () => {
      const storageId = `test-${random()}/foo/bar/baz`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);

      const retrievedStorage = await getStorage(account, storageId);
      expect(retrievedStorage.status).toBe(200);
      expect(retrievedStorage.headers.etag).toBe('W/"9c05511a31375a8a278a75207331bb1714e69dd1"');
      expect(retrievedStorage.data).toEqual({ etag: '9c05511a31375a8a278a75207331bb1714e69dd1', data: 'hello world' });
    }, 180000);

    test('Getting storage with hierarchy and funky characters should work', async () => {
      const storageId = `test-${random()}/:$(){}-!@/b12+/ba_^`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);

      const retrievedStorage = await getStorage(account, storageId);
      expect(retrievedStorage.status).toBe(200);
      expect(retrievedStorage.headers.etag).toBe('W/"9c05511a31375a8a278a75207331bb1714e69dd1"');
      expect(retrievedStorage.data).toEqual({ etag: '9c05511a31375a8a278a75207331bb1714e69dd1', data: 'hello world' });
    }, 180000);

    test('Getting storage that does not exist should return an error', async () => {
      const storageId = `test-${random()}`;
      const retrievedStorage = await getStorage(account, storageId);
      expectMore(retrievedStorage).toBeStorageNotFound(storageId);
    }, 180000);

    test('Getting storage with a malformed account id should return an error', async () => {
      const malformed = await getMalformedAccount();
      const storage = await getStorage(malformed, 'some-id');
      expectMore(storage).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Getting storage with a non-existing account should return an error', async () => {
      const storage = await getStorage(await getNonExistingAccount(), 'some-id');
      expectMore(storage).toBeUnauthorizedError();
    }, 180000);
  });
});
