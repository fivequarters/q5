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

    test('Getting storage that does not exist should return an error', async () => {
      const storageId = `test-${random()}`;
      const retrievedStorage = await getStorage(account, storageId);
      expectMore(retrievedStorage).toBeStorageNotFound(storageId);
    }, 180000);

    test('Getting storage with a storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a/b/c';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);

      const retrievedStorage = await getStorage(account, storageId, storagePath);
      expect(retrievedStorage.status).toBe(200);
      expect(retrievedStorage.headers.etag).toBe('W/"9c05511a31375a8a278a75207331bb1714e69dd1"');
      expect(retrievedStorage.data).toEqual({ etag: '9c05511a31375a8a278a75207331bb1714e69dd1', data: 'hello world' });

      const fullStorage = await getStorage(account, storageId);
      expect(fullStorage.status).toBe(200);
      expect(fullStorage.headers.etag).toBe('W/"5fb4267919d3b24fc7dafc928ae1b97104b0a5a6"');
      expect(fullStorage.data).toEqual({
        etag: '5fb4267919d3b24fc7dafc928ae1b97104b0a5a6',
        data: { a: { b: { c: 'hello world' } } },
      });
    }, 180000);

    test('Getting storage that does not exist with a storage path should return an error', async () => {
      const storageId = `test-${random()}`;
      const storagePath = 'a/b/c';
      const retrievedStorage = await getStorage(account, storageId, storagePath);
      expectMore(retrievedStorage).toBeStorageNotFound(storageId, storagePath);
    }, 180000);

    test('Getting storage with a storage path that does not exist should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a/b/c';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);

      const retrievedStorage = await getStorage(account, storageId, 'a/b/does-not-exist');
      expectMore(retrievedStorage).toBeStorageNotFound(storageId, 'a/b/does-not-exist');
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
