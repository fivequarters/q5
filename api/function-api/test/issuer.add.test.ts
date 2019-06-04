import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addIssuer, cleanUpIssuers } from './sdk';
import { extendExpect } from './extendJest';

const expectMore = extendExpect(expect);

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpIssuers(account);
}, 10000);

describe('Issuer', () => {
  describe('Add', () => {
    test('Adding an issuer with jsonKeysUrl should be supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('foo');
    }, 10000);

    test('Adding an issuer with a jsonKeysUrl and displayName should be supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { jsonKeysUrl: 'foo', displayName: 'fizz' });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('foo');
      expect(issuer.data.displayName).toBe('fizz');
    }, 10000);

    test('Adding an issuer with a publicKey should be supported', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      const issuer = await addIssuer(account, issuerId, { publicKeys });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
    }, 10000);

    test('Adding an issuer with a publicKey and displayName should be supported', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      const issuer = await addIssuer(account, issuerId, { publicKeys, displayName: 'fuzz' });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
      expect(issuer.data.displayName).toBe('fuzz');
    }, 10000);

    test('Adding an issuer with three publicKey should be supported', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [
        { publicKey: 'bar', keyId: 'kid-0' },
        { publicKey: 'baz', keyId: 'kid-1' },
        { publicKey: 'bat', keyId: 'kid-2' },
      ];
      const issuer = await addIssuer(account, issuerId, { publicKeys });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
    }, 10000);

    test('Adding an issuer with a jsonKeysUrl and publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      const issuer = await addIssuer(account, issuerId, { publicKeys, jsonKeysUrl: 'foo' });
      expectMore(issuer).toBeHttpError(
        400,
        `The issuer '${issuerId}' can not have both public keys and a json keys URL`
      );
    }, 10000);

    test('Adding an issuer with four publicKeys is not supported', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [
        { publicKey: 'bar', keyId: 'kid-0' },
        { publicKey: 'baz', keyId: 'kid-1' },
        { publicKey: 'bat', keyId: 'kid-2' },
        { publicKey: 'bap', keyId: 'kid-3' },
      ];
      const issuer = await addIssuer(account, issuerId, { publicKeys });
      expectMore(issuer).toBeHttpError(400, '"publicKeys" must contain less than or equal to 3 items');
    }, 10000);

    test('Adding an issuer with neither jsonKeysUrl or publicKeys is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, {});
      expectMore(issuer).toBeHttpError(
        400,
        `The issuer '${issuerId}' must have at least one public key or a json keys URL`
      );
    }, 10000);

    test('Adding an issuer with an empty jsonKeysUrl is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { jsonKeysUrl: '' });
      expectMore(issuer).toBeHttpError(400, '"jsonKeysUrl" is not allowed to be empty');
    }, 10000);

    test('Adding an issuer with an empty displayName is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { displayName: '', jsonKeysUrl: 'foo' });
      expectMore(issuer).toBeHttpError(400, '"displayName" is not allowed to be empty');
    }, 10000);

    test('Adding an issuer with an empty publicKeys array is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [] });
      expectMore(issuer).toBeHttpError(400, `"publicKeys" must contain at least 1 items`);
    }, 10000);

    test('Adding an issuer with a publicKey without a key id is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [{ publicKey: 'bar' }] });
      expectMore(issuer).toBeHttpError(400, '"keyId" is required');
    }, 10000);

    test('Adding an issuer with a publicKey with an empty string key id is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [{ publicKey: 'bar', keyId: '' }] });
      expectMore(issuer).toBeHttpError(400, '"keyId" is not allowed to be empty');
    }, 10000);

    test('Adding an issuer with a publicKey without an actual publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [{ keyId: 'bar' }] });
      expectMore(issuer).toBeHttpError(400, '"publicKey" is required');
    }, 10000);

    test('Adding an issuer with a publicKey with an empty string publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [{ keyId: 'bar', publicKey: '' }] });
      expectMore(issuer).toBeHttpError(400, '"publicKey" is not allowed to be empty');
    }, 10000);

    test('Adding an issuer that already exists is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer1 = await addIssuer(account, issuerId, { publicKeys: [{ publicKey: 'foo', keyId: 'bar' }] });
      expect(issuer1.status).toBe(200);

      const issuer2 = await addIssuer(account, issuerId, { publicKeys: [{ publicKey: 'foo', keyId: 'bar' }] });
      expectMore(issuer2).toBeHttpError(400, `The issuer '${issuerId}' already exists`);
    }, 10000);

    test('Adding an issuer with a malformed account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'foo', keyId: 'bar' }];
      const malformed = await getMalformedAccount();
      const issuer = await addIssuer(malformed, issuerId, { publicKeys });
      expectMore(issuer).toBeMalformedAccountError(malformed.accountId);
    }, 10000);

    test('Adding an issuer with a non-existing account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'foo', keyId: 'bar' }];
      const issuer = await addIssuer(await getNonExistingAccount(), issuerId, { publicKeys });
      expectMore(issuer).toBeUnauthorizedError();
    }, 10000);
  });
});
