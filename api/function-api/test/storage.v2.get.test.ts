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

describe('Storage Get', () => {
  describe('Get', () => {
    test('Getting storage with no storage path should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage).toBeHttp({ statusCode: 200 });

      const retrievedStorage = await getStorage(account, storageId);
      expect(retrievedStorage).toBeHttp({ statusCode: 200 });
      expect(retrievedStorage.data.data).toEqual('hello world');
      expect(retrievedStorage.data.etag).toBeUUID();
    }, 180000);

    test('Getting storage with hierarchy should work', async () => {
      const storageId = `test-${random()}/foo/bar/baz`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage).toBeHttp({ statusCode: 200 });

      const retrievedStorage = await getStorage(account, storageId);
      expect(retrievedStorage).toBeHttp({ statusCode: 200 });
      expect(retrievedStorage.data.data).toEqual('hello world');
      expect(retrievedStorage.data.etag).toBeUUID();
    }, 180000);

    test('Getting storage with hierarchy and funky characters should work', async () => {
      const storageId = `test-${random()}/:$(){}-!@/b12+/ba_^`;
      const storageData = { data: 'hello world' };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage).toBeHttp({ statusCode: 200 });

      const retrievedStorage = await getStorage(account, storageId);
      expect(retrievedStorage).toBeHttp({ statusCode: 200 });
      expect(retrievedStorage.data.data).toEqual('hello world');
      expect(retrievedStorage.data.etag).toBeUUID();
    }, 180000);

    test('Getting storage that does not exist should return an error', async () => {
      const storageId = `test-${random()}`;
      const retrievedStorage = await getStorage(account, storageId);
      expect(retrievedStorage).toBeHttp({ statusCode: 404 });
    }, 180000);

    test('Getting storage with a malformed account id should return an error', async () => {
      const malformed = await getMalformedAccount();
      const storage = await getStorage(malformed, 'some-id');
      expect(storage).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Getting storage with a non-existing account should return an error', async () => {
      const storage = await getStorage(await getNonExistingAccount(), 'some-id');
      expect(storage).toBeUnauthorizedError();
    }, 180000);
  });
});
