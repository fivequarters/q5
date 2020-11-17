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
}, 180000);

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
    }, 180000);

    test('Removing storage with hierarchy should work', async () => {
      const storageId = `test-${random()}/foo`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);

      const removedStorage = await removeStorage(account, storageId);
      expect(removedStorage.status).toBe(204);
      expect(removedStorage.data).toBeUndefined();

      const noSuchStorage = await getStorage(account, storageId);
      expectMore(noSuchStorage).toBeStorageNotFound(storageId);
    }, 180000);

    test('Removing storage with hierarchy recursively should work', async () => {
      const storageIdPrefix = `test-${random()}`;
      const storageData = { data: 'hello world' };
      let storage = await setStorage(account, `${storageIdPrefix}/foo`, storageData);
      expect(storage.status).toBe(200);
      storage = await setStorage(account, `${storageIdPrefix}/bar/baz`, storageData);
      expect(storage.status).toBe(200);
      storage = await setStorage(account, `${storageIdPrefix}/bar`, storageData);
      expect(storage.status).toBe(200);

      const removedStorage = await removeStorage(account, `${storageIdPrefix}/*`);
      expect(removedStorage.status).toBe(204);
      expect(removedStorage.data).toBeUndefined();

      let noSuchStorage = await getStorage(account, `${storageIdPrefix}/foo`);
      expectMore(noSuchStorage).toBeStorageNotFound(`${storageIdPrefix}/foo`);
      noSuchStorage = await getStorage(account, `${storageIdPrefix}/bar/baz`);
      expectMore(noSuchStorage).toBeStorageNotFound(`${storageIdPrefix}/bar/baz`);
      noSuchStorage = await getStorage(account, `${storageIdPrefix}/bar`);
      expectMore(noSuchStorage).toBeStorageNotFound(`${storageIdPrefix}/bar`);
    }, 180000);

    test('Removing storage node from hierarchy does not affect other nodes', async () => {
      const storageIdPrefix = `test-${random()}`;
      const storageData = { data: 'hello world' };
      let storage = await setStorage(account, `${storageIdPrefix}/foo`, storageData);
      expect(storage.status).toBe(200);
      storage = await setStorage(account, `${storageIdPrefix}/bar/baz`, storageData);
      expect(storage.status).toBe(200);
      storage = await setStorage(account, `${storageIdPrefix}/bar`, storageData);
      expect(storage.status).toBe(200);

      const removedStorage = await removeStorage(account, `${storageIdPrefix}/bar`);
      expect(removedStorage.status).toBe(204);
      expect(removedStorage.data).toBeUndefined();

      let retrievedStorage = await getStorage(account, `${storageIdPrefix}/foo`);
      expect(retrievedStorage.status).toBe(200);
      retrievedStorage = await getStorage(account, `${storageIdPrefix}/bar/baz`);
      expect(retrievedStorage.status).toBe(200);
      let noSuchStorage = await getStorage(account, `${storageIdPrefix}/bar`);
      expectMore(noSuchStorage).toBeStorageNotFound(`${storageIdPrefix}/bar`);
    }, 180000);

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
    }, 180000);

    test('Removing storage with an invalid etag in the header should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);
      const etag = storage.data.etag + 'abc';

      const removedStorage = await removeStorage(account, storageId, etag);
      expectMore(removedStorage).toBeStorageConflict(storageId, etag, false);
    }, 180000);

    test('Removing storage that does not exist should return an error', async () => {
      const storageId = `test-${random()}`;
      const removedStorage = await removeStorage(account, storageId);
      expectMore(removedStorage).toBeStorageNotFound(storageId);
    }, 180000);

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
    }, 180000);

    test('Removing storage with a malformed account id should return an error', async () => {
      const malformed = await getMalformedAccount();
      const storage = await removeStorage(malformed, 'some-id');
      expectMore(storage).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Removing storage with a non-existing account should return an error', async () => {
      const storage = await removeStorage(await getNonExistingAccount(), 'some-id');
      expectMore(storage).toBeUnauthorizedError();
    }, 180000);
  });
});
