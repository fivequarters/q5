import { random } from '@5qtrs/random';

import { getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addIssuer, updateIssuer, cleanUpIssuers } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterEach(async () => {
  await cleanUpIssuers(account);
}, 180000);

describe('Issuer Update', () => {
  describe('Update', () => {
    test('Updating an issuer with jsonKeysUrl should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { jsonKeysUrl: 'bar' });
      expect(issuer).toBeHttp({ statusCode: 200 });
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('bar');
      expect(issuer.data.publicKeys).toBeUndefined();
      expect(issuer.data.displayName).toBeUndefined();
    }, 180000);

    test('Updating an issuer with jsonKeysUrl should replace public keys', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys });

      const issuer = await updateIssuer(account, issuerId, { jsonKeysUrl: 'bar' });
      expect(issuer).toBeHttp({ statusCode: 200 });
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('bar');
      expect(issuer.data.publicKeys).toBeUndefined();
      expect(issuer.data.displayName).toBeUndefined();
    }, 180000);

    test('Updating an issuer with publicKeys should be supported', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys });

      publicKeys[0].publicKey = 'foo';
      const issuer = await updateIssuer(account, issuerId, { publicKeys });
      expect(issuer).toBeHttp({ statusCode: 200 });
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
    }, 180000);

    test('Updating an issuer with publicKeys should replace jsonKeysUrl', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys });
      expect(issuer).toBeHttp({ statusCode: 200 });
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
    }, 180000);

    test('Updating an issuer displayName should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo', displayName: 'bar' });

      const issuer = await updateIssuer(account, issuerId, { displayName: 'biz' });
      expect(issuer).toBeHttp({ statusCode: 200 });
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('foo');
      expect(issuer.data.publicKeys).toBeUndefined();
      expect(issuer.data.displayName).toBe('biz');
    }, 180000);

    test('Updating an issuer with three publicKey should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });
      const publicKeys = [
        { publicKey: 'bar', keyId: 'kid-0' },
        { publicKey: 'baz', keyId: 'kid-1' },
        { publicKey: 'bat', keyId: 'kid-2' },
      ];
      const issuer = await updateIssuer(account, issuerId, { publicKeys });
      expect(issuer).toBeHttp({ statusCode: 200 });
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
    }, 180000);

    test('Updating an issuer with a jsonKeysUrl and publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      const issuer = await updateIssuer(account, issuerId, { publicKeys, jsonKeysUrl: 'foo' });
      expect(issuer).toBeHttpError(400, `The issuer '${issuerId}' can not have both public keys and a json keys URL`);
    }, 180000);

    test('Updating an issuer with empty string jsonKeysUrl is be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { jsonKeysUrl: '' });
      expect(issuer).toBeHttpError(400, '"jsonKeysUrl" is not allowed to be empty');
    }, 180000);

    test('Updating an issuer with empty string displayName is be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { displayName: '' });
      expect(issuer).toBeHttpError(400, '"displayName" is not allowed to be empty');
    }, 180000);

    test('Updating an issuer with the id in the body should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });
      const issuer = await updateIssuer(account, issuerId, { id: issuerId, jsonKeysUrl: 'updated' });
      expect(issuer).toBeHttp({ statusCode: 200 });
      expect(issuer.data.id).toBeDefined();
      expect(issuer.data.jsonKeysUrl).toBe('updated');
      expect(issuer.data.id).toBe(issuerId);
    }, 180000);

    test('Updating an issuer with an id in the body that does not match the url returns an error', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });
      const id = 'other-issuer-id';
      const issuer = await updateIssuer(account, issuerId, { id, jsonKeysUrl: 'updated' });
      expect(issuer).toBeHttpError(
        400,
        `The issuerId in the body '${id}' does not match the issuerId in the URL '${issuerId}'`
      );
    }, 180000);

    test('Updating an issuer with four publicKeys is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const publicKeys = [
        { publicKey: 'bar', keyId: 'kid-0' },
        { publicKey: 'baz', keyId: 'kid-1' },
        { publicKey: 'bat', keyId: 'kid-2' },
        { publicKey: 'bap', keyId: 'kid-3' },
      ];
      const issuer = await updateIssuer(account, issuerId, { publicKeys });
      expect(issuer).toBeHttpError(400, '"publicKeys" must contain less than or equal to 3 items');
    }, 180000);

    test('Updating an issuer with no updated fields is a no-op', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, {});
      expect(issuer).toBeHttp({ statusCode: 200 });
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('foo');
      expect(issuer.data.publicKeys).toBeUndefined();
    }, 180000);

    test('Updating an issuer with an empty publicKeys array is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [] });
      expect(issuer).toBeHttpError(400, `"publicKeys" must contain at least 1 items`);
    }, 180000);

    test('Updating an issuer with a publicKey without a key id is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [{ publicKey: 'bar' }] });
      expect(issuer).toBeHttpError(400, '"keyId" is required');
    }, 180000);

    test('Updating an issuer with a publicKey with an empty key id is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [{ publicKey: 'bar', keyId: '' }] });
      expect(issuer).toBeHttpError(400, '"keyId" is not allowed to be empty');
    }, 180000);

    test('Updating an issuer with a publicKey without an actual publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [{ keyId: 'bar' }] });
      expect(issuer).toBeHttpError(400, '"publicKey" is required');
    }, 180000);

    test('Updating an issuer with a publicKey with an empty publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [{ keyId: 'bar', publicKey: '' }] });
      expect(issuer).toBeHttpError(400, '"publicKey" is not allowed to be empty');
    }, 180000);

    test('Updating a non-existing issuer should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];

      const issuer = await updateIssuer(account, issuerId, { publicKeys });
      expect(issuer).toBeHttpError(404, `The issuer '${issuerId}' is not associated with the account`);
    }, 180000);

    test('Getting an issuer with a malformed account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys });

      const malformed = await getMalformedAccount();
      const issuer = await updateIssuer(malformed, issuerId, { publicKeys });
      expect(issuer).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Getting an issuer with a non-existing account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys });

      const issuer = await updateIssuer(await getNonExistingAccount(), issuerId, { publicKeys });
      expect(issuer).toBeUnauthorizedError();
    }, 180000);
  });
});
