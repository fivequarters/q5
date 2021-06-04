import { random } from '@5qtrs/random';

import { getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { setStorage, getStorage, cleanUpStorage, INVALID_UUID } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterEach(async () => {
  await cleanUpStorage(account);
}, 180000);

interface IStorageData {
  data: any;
  tags?: { [tagName: string]: string };
  expires?: string;
}

describe('Storage Metadata', () => {
  describe('Tags', () => {
    test('Setting storage with tags should work', async () => {
      const storageId = `test-${random()}`;
      const storageData = { data: 'hello world', tags: { someTag: 'tagValue' } };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage).toBeHttp({ statusCode: 200 });
      expect(storage.data.data).toEqual('hello world');
      expect(storage.data.etag).toBeUUID();
      expect(storage.data.tags).toEqual({ someTag: 'tagValue' });
    }, 180000);

    test('Clearing storage tags should work', async () => {
      const storageId = `test-${random()}`;
      let storageData: IStorageData = { data: 'hello world', tags: { someTag: 'tagValue' } };
      let storage = await setStorage(account, storageId, storageData);
      expect(storage).toBeHttp({ statusCode: 200 });
      storageData = { data: 'hello world2' };
      storage = await setStorage(account, storageId, storageData);
      expect(storage.data.data).toEqual('hello world2');
      expect(storage.data.etag).toBeUUID();
      expect(storage.data.tags).toEqual({});
    }, 180000);
  });

  describe('Expires', () => {
    test('Setting storage with expiry should work', async () => {
      const storageId = `test-${random()}`;
      const expires = new Date().toISOString();
      const storageData = { data: 'hello world', expires };
      const storage = await setStorage(account, storageId, storageData);
      expect(storage).toBeHttp({ statusCode: 200 });
      expect(storage.data.data).toEqual('hello world');
      expect(storage.data.etag).toBeUUID();

      // Slightly different versions of the ISO string, but compatible.
      expect(new Date(Date.parse(storage.data.expires)).toISOString()).toBe(expires.valueOf());
    }, 180000);
  });
});
