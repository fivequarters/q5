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
  describe('Set', () => {
    test('Setting storage with no etag and no storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);
      expect(storage.headers.etag).toBe('W/"9c05511a31375a8a278a75207331bb1714e69dd1"');
      expect(storage.data).toEqual({ etag: '9c05511a31375a8a278a75207331bb1714e69dd1', data: 'hello world' });
    }, 180000);

    test('Setting storage with a valid etag in the body and no storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      const updatedData = storage.data;
      updatedData.data = updatedData.data + ' - updated';

      const storageUpdated = await setStorage(account, storageId, updatedData);
      expect(storageUpdated.status).toBe(200);
      expect(storageUpdated.headers.etag).toBe('W/"259a91211006602f044467037d6625f9caf88982"');
      expect(storageUpdated.data).toEqual({
        etag: '259a91211006602f044467037d6625f9caf88982',
        data: 'hello world - updated',
      });
    }, 180000);

    test('Setting storage with a valid etag in the header and no storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      const updatedData = storage.data;
      const etag = updatedData.etag;
      updatedData.data = updatedData.data + ' - updated';
      updatedData.etag = undefined;

      const storageUpdated = await setStorage(account, storageId, updatedData, etag);
      expect(storageUpdated.status).toBe(200);
      expect(storageUpdated.headers.etag).toBe('W/"259a91211006602f044467037d6625f9caf88982"');
      expect(storageUpdated.data).toEqual({
        etag: '259a91211006602f044467037d6625f9caf88982',
        data: 'hello world - updated',
      });
    }, 180000);

    test('Setting storage with a valid etag in the header and body and no storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      const updatedData = storage.data;
      const etag = updatedData.etag;
      updatedData.data = updatedData.data + ' - updated';

      const storageUpdated = await setStorage(account, storageId, updatedData, etag);
      expect(storageUpdated.status).toBe(200);
      expect(storageUpdated.headers.etag).toBe('W/"259a91211006602f044467037d6625f9caf88982"');
      expect(storageUpdated.data).toEqual({
        etag: '259a91211006602f044467037d6625f9caf88982',
        data: 'hello world - updated',
      });
    }, 180000);

    test('Setting storage with an invalid etag in the header and no storage path should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      const updatedData = storage.data;
      const etag = updatedData.etag;
      updatedData.data = updatedData.data + ' - updated';
      updatedData.etag = undefined;
      const invalidEtag = etag + 'abc';

      const storageUpdated = await setStorage(account, storageId, updatedData, invalidEtag);
      expectMore(storageUpdated).toBeStorageConflict(storageId, invalidEtag);
    }, 180000);

    test('Setting storage with an invalid etag in the body and no storage path should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      const updatedData = storage.data;
      updatedData.data = updatedData.data + ' - updated';
      updatedData.etag = updatedData.etag + 'abc';

      const storageUpdated = await setStorage(account, storageId, updatedData);
      expectMore(storageUpdated).toBeStorageConflict(storageId, updatedData.etag);
    }, 180000);

    test('Setting storage with an etag mismatch in the header and body should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      const updatedData = storage.data;
      const etag = updatedData.etag;
      updatedData.data = updatedData.data + ' - updated';

      const storageUpdated = await setStorage(account, storageId, updatedData, etag + 'abc');
      expect(storageUpdated.status).toBe(400);
      expect(storageUpdated.data.status).toBe(400);
      expect(storageUpdated.data.statusCode).toBe(400);
      expect(storageUpdated.data.message).toBe(
        [
          "The etag in the body '9c05511a31375a8a278a75207331bb1714e69dd1' does not match",
          "the etag in the If-Match header '9c05511a31375a8a278a75207331bb1714e69dd1abc'",
        ].join(' ')
      );
    }, 180000);

    test('Setting storage with no data should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: '' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(400);
      expect(storage.data.status).toBe(400);
      expect(storage.data.statusCode).toBe(400);
      expect(storage.data.message).toBe(`No data was provided for '${storageId}'`);
    }, 180000);

    test('Setting storage with no etag and one storage path segment should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);
      expect(storage.headers.etag).toBe('W/"9c05511a31375a8a278a75207331bb1714e69dd1"');
      expect(storage.data).toEqual({
        etag: '9c05511a31375a8a278a75207331bb1714e69dd1',
        data: 'hello world',
      });

      const checkStorage = await getStorage(account, storageId);
      expect(checkStorage.status).toBe(200);
      expect(checkStorage.headers.etag).toBe('W/"d4b9870c9c43bd2e5c79cab3a8545f17c2b3d91d"');
      expect(checkStorage.data).toEqual({
        etag: 'd4b9870c9c43bd2e5c79cab3a8545f17c2b3d91d',
        data: { a: 'hello world' },
      });
    }, 180000);

    test('Setting storage with no etag and many storage path segments should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = `and here is a path/with a bunch of crazy//${encodeURIComponent('__#$yo!')}`;
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);
      expect(storage.headers.etag).toBe('W/"9c05511a31375a8a278a75207331bb1714e69dd1"');
      expect(storage.data).toEqual({
        etag: '9c05511a31375a8a278a75207331bb1714e69dd1',
        data: 'hello world',
      });

      const checkStorage = await getStorage(account, storageId);
      expect(checkStorage.status).toBe(200);
      expect(checkStorage.headers.etag).toBe('W/"b6a79c761c0cae18919ccfd12e01b0964bd52589"');
      expect(checkStorage.data).toEqual({
        etag: 'b6a79c761c0cae18919ccfd12e01b0964bd52589',
        data: { 'and here is a path': { 'with a bunch of crazy': { '__#$yo!': 'hello world' } } },
      });
    }, 180000);

    test('Setting storage with a storage path that replaces a non-object should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a';
      const storage = await setStorage(account, storageId, storageData);
      expect(storage.status).toBe(200);

      const updatedStorage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(updatedStorage.status).toBe(200);
      expect(updatedStorage.headers.etag).toBe('W/"9c05511a31375a8a278a75207331bb1714e69dd1"');
      expect(updatedStorage.data).toEqual({
        etag: '9c05511a31375a8a278a75207331bb1714e69dd1',
        data: 'hello world',
      });

      const checkStorage = await getStorage(account, storageId);
      expect(checkStorage.status).toBe(200);
      expect(checkStorage.headers.etag).toBe('W/"d4b9870c9c43bd2e5c79cab3a8545f17c2b3d91d"');
      expect(checkStorage.data).toEqual({
        etag: 'd4b9870c9c43bd2e5c79cab3a8545f17c2b3d91d',
        data: { a: 'hello world' },
      });
    }, 180000);

    test('Setting storage with a valid etag in the body and a storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);

      storage.data.data = 'hello world - updated';

      const updatedStorage = await setStorage(account, storageId, storage.data, undefined, storagePath);
      expect(updatedStorage.status).toBe(200);
      expect(updatedStorage.headers.etag).toBe('W/"259a91211006602f044467037d6625f9caf88982"');
      expect(updatedStorage.data).toEqual({
        etag: '259a91211006602f044467037d6625f9caf88982',
        data: 'hello world - updated',
      });

      const checkStorage = await getStorage(account, storageId);
      expect(checkStorage.status).toBe(200);
      expect(checkStorage.headers.etag).toBe('W/"56334875cec73e43b0bb2f6cea5c66fec4ba5758"');
      expect(checkStorage.data).toEqual({
        etag: '56334875cec73e43b0bb2f6cea5c66fec4ba5758',
        data: { a: 'hello world - updated' },
      });
    }, 180000);

    test('Setting storage with a valid etag in the header and a storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);

      storage.data.data = 'hello world - updated';
      const etag = storage.data.etag;
      storage.data.etag = undefined;

      const updatedStorage = await setStorage(account, storageId, storage.data, etag, storagePath);
      expect(updatedStorage.status).toBe(200);
      expect(updatedStorage.headers.etag).toBe('W/"259a91211006602f044467037d6625f9caf88982"');
      expect(updatedStorage.data).toEqual({
        etag: '259a91211006602f044467037d6625f9caf88982',
        data: 'hello world - updated',
      });

      const checkStorage = await getStorage(account, storageId);
      expect(checkStorage.status).toBe(200);
      expect(checkStorage.headers.etag).toBe('W/"56334875cec73e43b0bb2f6cea5c66fec4ba5758"');
      expect(checkStorage.data).toEqual({
        etag: '56334875cec73e43b0bb2f6cea5c66fec4ba5758',
        data: { a: 'hello world - updated' },
      });
    }, 180000);

    test('Setting storage with a valid etag in both the header and body and a storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      expect(storage.status).toBe(200);

      storage.data.data = 'hello world - updated';
      const etag = storage.data.etag;

      const updatedStorage = await setStorage(account, storageId, storage.data, etag, storagePath);
      expect(updatedStorage.status).toBe(200);
      expect(updatedStorage.headers.etag).toBe('W/"259a91211006602f044467037d6625f9caf88982"');
      expect(updatedStorage.data).toEqual({
        etag: '259a91211006602f044467037d6625f9caf88982',
        data: 'hello world - updated',
      });

      const checkStorage = await getStorage(account, storageId);
      expect(checkStorage.status).toBe(200);
      expect(checkStorage.headers.etag).toBe('W/"56334875cec73e43b0bb2f6cea5c66fec4ba5758"');
      expect(checkStorage.data).toEqual({
        etag: '56334875cec73e43b0bb2f6cea5c66fec4ba5758',
        data: { a: 'hello world - updated' },
      });
    }, 180000);

    test('Setting storage with an invalid etag in the header and no storage path should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a/b';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      const updatedData = storage.data;
      const etag = updatedData.etag;
      updatedData.data = updatedData.data + ' - updated';
      updatedData.etag = undefined;
      const invalidEtag = etag + 'abc';

      const storageUpdated = await setStorage(account, storageId, updatedData, invalidEtag, storagePath);
      expectMore(storageUpdated).toBeStorageConflict(storageId, invalidEtag, true, storagePath);
    }, 180000);

    test('Setting storage with an invalid etag in the body and a storage path should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storagePath = 'a/b';
      const storage = await setStorage(account, storageId, storageData, undefined, storagePath);
      const updatedData = storage.data;
      updatedData.data = updatedData.data + ' - updated';
      updatedData.etag = updatedData.etag + 'abc';

      const storageUpdated = await setStorage(account, storageId, updatedData, undefined, storagePath);
      expectMore(storageUpdated).toBeStorageConflict(storageId, updatedData.etag, true, storagePath);
    }, 180000);

    test('Setting storage with no storage id should return an error', async () => {
      const storage = await setStorage(account, '', { msg: 'test-data' });
      expectMore(storage).toBeNotFoundError();
    }, 180000);

    test('Setting storage with a malformed account id should return an error', async () => {
      const malformed = await getMalformedAccount();
      const storage = await setStorage(malformed, 'some-id', {});
      expectMore(storage).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Setting storage with a non-existing account should return an error', async () => {
      const storage = await setStorage(await getNonExistingAccount(), 'some-id', {});
      expectMore(storage).toBeUnauthorizedError();
    }, 180000);
  });
});
