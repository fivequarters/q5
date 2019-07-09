import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { setStorage, getStorage, removeStorage, cleanUpStorage } from './sdk';
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
  describe('Remove', () => {
    test('Removing storage with no etag and no storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);

      const removedStorage = await removeStorage(account, storageId);
      expect(removedStorage.status).toBe(204);
      expect(removedStorage.data).toBeUndefined();

      const noSuchStorage = await getStorage(account, storageId);
      expectMore(noSuchStorage).toBeStorageNotFound(storageId);
    }, 20000);

    test('Removing storage with a valid etag in the header and no storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);

      const etag = storage.data.etag;

      const removedStorage = await removeStorage(account, storageId, etag);
      expect(removedStorage.status).toBe(204);
      expect(removedStorage.data).toBeUndefined();

      const noSuchStorage = await getStorage(account, storageId);
      expectMore(noSuchStorage).toBeStorageNotFound(storageId);
    }, 20000);

    test('Removing storage with an invalid etag in the header should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);
      const etag = storage.data.etag + 'abc';

      const removedStorage = await removeStorage(account, storageId, etag);
      expectMore(removedStorage).toBeStorageConflict(storageId, etag, false);
    }, 20000);

    test('Removing storage that does not exist should return an error', async () => {
      const storageId = `test-${random()}`;
      const removedStorage = await removeStorage(account, storageId);
      expectMore(removedStorage).toBeStorageNotFound(storageId);
    }, 20000);

    test('Removing storage that does not exist with an etag should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);

      const etag = storage.data.etag;

      const removedStorage = await removeStorage(account, storageId, etag);
      expect(removedStorage.status).toBe(204);

      const removedAgainStorage = await removeStorage(account, storageId, etag);
      expectMore(removedAgainStorage).toBeStorageConflict(storageId, etag, false);
    }, 20000);

    test('Removing storage with no etag with a storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a/b/c';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);

      const removedStorage = await removeStorage(account, storageId, undefined, storagePath);
      expect(removedStorage.status).toBe(204);
      expect(removedStorage.data).toBeUndefined();

      const noSuchStorage = await getStorage(account, storageId, storagePath);
      expectMore(noSuchStorage).toBeStorageNotFound(storageId, storagePath);

      const checkStorage = await getStorage(account, storageId);
      expect(checkStorage.status).toBe(200);
      expect(checkStorage.headers.etag).toBe('W/"36bd50cf1ba0d5342e109efd632360fc53891b37"');
      expect(checkStorage.data).toEqual({
        etag: '36bd50cf1ba0d5342e109efd632360fc53891b37',
        data: { a: { b: {} } },
      });
    }, 20000);

    test('Removing storage with a valid etag in the header and a storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a/b/c';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);

      const removedStorage = await removeStorage(account, storageId, storage.data.etag, storagePath);
      expect(removedStorage.status).toBe(204);
      expect(removedStorage.data).toBeUndefined();

      const noSuchStorage = await getStorage(account, storageId, storagePath);
      expectMore(noSuchStorage).toBeStorageNotFound(storageId, storagePath);

      const checkStorage = await getStorage(account, storageId);
      expect(checkStorage.status).toBe(200);
      expect(checkStorage.headers.etag).toBe('W/"36bd50cf1ba0d5342e109efd632360fc53891b37"');
      expect(checkStorage.data).toEqual({
        etag: '36bd50cf1ba0d5342e109efd632360fc53891b37',
        data: { a: { b: {} } },
      });
    }, 20000);

    test('Removing storage with an invalid etag in the header and a storage path should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a/b/c';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);
      const etag = storage.data.etag + 'abc';

      const removedStorage = await removeStorage(account, storageId, etag, storagePath);
      expectMore(removedStorage).toBeStorageConflict(storageId, etag, false, storagePath);
    }, 20000);

    test('Removing storage that does not exist with a storage path should return an error', async () => {
      const storageId = `test-${random()}`;
      const storagePath = 'a/b/c';
      const removedStorage = await removeStorage(account, storageId, undefined, storagePath);
      expectMore(removedStorage).toBeStorageNotFound(storageId, storagePath);
    }, 20000);

    test('Removing storage with a storage path that does not exist should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a/b/c';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);

      const removedStorage = await removeStorage(account, storageId, undefined, 'a/b/does-not-exist');
      expectMore(removedStorage).toBeStorageNotFound(storageId, 'a/b/does-not-exist');
    }, 20000);

    test('Removing storage with a malformed account id should return an error', async () => {
      const malformed = await getMalformedAccount();
      const storage = await removeStorage(malformed, 'some-id');
      expectMore(storage).toBeMalformedAccountError(malformed.accountId);
    }, 10000);

    test('Removing storage with a non-existing account should return an error', async () => {
      const storage = await removeStorage(await getNonExistingAccount(), 'some-id');
      expectMore(storage).toBeUnauthorizedError();
    }, 10000);
  });
});
