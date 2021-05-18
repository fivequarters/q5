import { random } from '@5qtrs/random';

import { getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { setStorage, getStorage, cleanUpStorage } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterEach(async () => {
  await cleanUpStorage(account);
}, 180000);

describe('Storage Set', () => {
  describe('Set', () => {
    test('Setting storage with no etag and no storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage).toBeHttp({ statusCode: 200 });
      expect(storage.data).toEqual({ etag: '9c05511a31375a8a278a75207331bb1714e69dd1', data: 'hello world' });
    }, 180000);

    test('Setting storage with hierarchy should work', async () => {
      const storageId = `test-${random()}/foo/bar/baz`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage).toBeHttp({ statusCode: 200 });
      expect(storage.data).toEqual({ etag: '9c05511a31375a8a278a75207331bb1714e69dd1', data: 'hello world' });
    }, 180000);

    test('Setting storage with hierarchy without leading slash should fail', async () => {
      const storageId = `test-${random()}/foo/bar/baz`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData, undefined, true);
      expect(storage).toBeHttp({ statusCode: 404 });
    }, 180000);

    test('Setting storage with hierarchy and funky characters should work', async () => {
      const storageId = `test-${random()}/:$()!@/b12+/ba_^`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage).toBeHttp({ statusCode: 200 });
      expect(storage.data).toEqual({ etag: '9c05511a31375a8a278a75207331bb1714e69dd1', data: 'hello world' });
    }, 180000);

    test('Setting storage with hierarchy and * character in storageId should fail', async () => {
      const storageId = `test-${random()}/foo/b*r/baz`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage).toBeHttp({ statusCode: 400 });
    }, 180000);

    test('Setting storage with a valid etag in the body and no storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      const updatedData = storage.data;
      updatedData.data = updatedData.data + ' - updated';

      const storageUpdated = await setStorage(account, storageId, updatedData);
      expect(storageUpdated).toBeHttp({ statusCode: 200 });
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
      expect(storageUpdated).toBeHttp({ statusCode: 200 });
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
      expect(storageUpdated).toBeHttp({ statusCode: 200 });
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
      expect(storageUpdated).toBeStorageConflict(storageId, invalidEtag);
    }, 180000);

    test('Setting storage with an invalid etag in the body and no storage path should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      const updatedData = storage.data;
      updatedData.data = updatedData.data + ' - updated';
      updatedData.etag = updatedData.etag + 'abc';

      const storageUpdated = await setStorage(account, storageId, updatedData);
      expect(storageUpdated).toBeStorageConflict(storageId, updatedData.etag);
    }, 180000);

    test('Setting storage with an etag mismatch in the header and body should return an error', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      const updatedData = storage.data;
      const etag = updatedData.etag;
      updatedData.data = updatedData.data + ' - updated';

      const storageUpdated = await setStorage(account, storageId, updatedData, etag + 'abc');
      expect(storageUpdated).toBeHttpError(
        400,
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
      expect(storage).toBeHttpError(400, `No data was provided for '${storageId}'`);
    }, 180000);

    test('Setting storage with no storage id should return an error', async () => {
      const storage = await setStorage(account, '', { msg: 'test-data' });
      expect(storage).toBeNotFoundError();
    }, 180000);

    test('Setting storage with no storage id and no trailing slash should return an error', async () => {
      const storage = await setStorage(account, '', { msg: 'test-data' }, undefined, true);
      expect(storage).toBeNotFoundError();
    }, 180000);

    test('Setting storage with a malformed account id should return an error', async () => {
      const malformed = await getMalformedAccount();
      const storage = await setStorage(malformed, 'some-id', {});
      expect(storage).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Setting storage with a non-existing account should return an error', async () => {
      const storage = await setStorage(await getNonExistingAccount(), 'some-id', {});
      expect(storage).toBeUnauthorizedError();
    }, 180000);
  });
});
