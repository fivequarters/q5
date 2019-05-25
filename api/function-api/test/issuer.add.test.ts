import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addIssuer, cleanUpIssuers } from './sdk';

let account: IAccount = FakeAccount;
let invalidAccount: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
  invalidAccount = {
    accountId: 'acc-9999999999999999',
    subscriptionId: account.subscriptionId,
    baseUrl: account.baseUrl,
    accessToken: account.accessToken,
  };
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
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe(`The issuer '${issuerId}' can not have both public keys and a json keys URL`);
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
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"publicKeys" must contain less than or equal to 3 items');
    }, 10000);

    test('Adding an issuer with neither jsonKeysUrl or publicKeys is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, {});
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe(`The issuer '${issuerId}' must have at least one public key or a json keys URL`);
    }, 10000);

    test('Adding an issuer with an empty jsonKeysUrl is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { jsonKeysUrl: '' });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"jsonKeysUrl" is not allowed to be empty');
    }, 10000);

    test('Adding an issuer with an empty displayName is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { displayName: '', jsonKeysUrl: 'foo' });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"displayName" is not allowed to be empty');
    }, 10000);

    test('Adding an issuer with an empty publicKeys array is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe(`"publicKeys" must contain at least 1 items`);
    }, 10000);

    test('Adding an issuer with a publicKey without a key id is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [{ publicKey: 'bar' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"keyId" is required');
    }, 10000);

    test('Adding an issuer with a publicKey with an empty string key id is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [{ publicKey: 'bar', keyId: '' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"keyId" is not allowed to be empty');
    }, 10000);

    test('Adding an issuer with a publicKey without an actual publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [{ keyId: 'bar' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"publicKey" is required');
    }, 10000);

    test('Adding an issuer with a publicKey with an empty string publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [{ keyId: 'bar', publicKey: '' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"publicKey" is not allowed to be empty');
    }, 10000);

    test('Adding an issuer that already exists is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer1 = await addIssuer(account, issuerId, { publicKeys: [{ publicKey: 'foo', keyId: 'bar' }] });
      expect(issuer1.status).toBe(200);

      const issuer2 = await addIssuer(account, issuerId, { publicKeys: [{ publicKey: 'foo', keyId: 'bar' }] });
      expect(issuer2.status).toBe(400);
      expect(issuer2.data.status).toBe(400);
      expect(issuer2.data.statusCode).toBe(400);
      expect(issuer2.data.message).toBe(`The issuer '${issuerId}' already exists`);
    }, 10000);

    test('Adding an issuer with a non-existing account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(invalidAccount, issuerId, { publicKeys: [{ publicKey: 'foo', keyId: 'bar' }] });
      expect(issuer.status).toBe(404);
      expect(issuer.data.status).toBe(404);
      expect(issuer.data.statusCode).toBe(404);

      const message = issuer.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 10000);
  });
});
