import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addIssuer, updateIssuer, cleanUpIssuers } from './sdk';

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
  describe('Update', () => {
    test('Updating an issuer with jsonKeysUrl should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { jsonKeysUrl: 'bar' });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('bar');
      expect(issuer.data.publicKeys).toBeUndefined();
      expect(issuer.data.displayName).toBeUndefined();
    }, 10000);

    test('Updating an issuer with jsonKeysUrl should replace public keys', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys });

      const issuer = await updateIssuer(account, issuerId, { jsonKeysUrl: 'bar' });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('bar');
      expect(issuer.data.publicKeys).toBeUndefined();
      expect(issuer.data.displayName).toBeUndefined();
    }, 10000);

    test('Updating an issuer with publicKeys should be supported', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys });

      publicKeys[0].publicKey = 'foo';
      const issuer = await updateIssuer(account, issuerId, { publicKeys });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
    }, 10000);

    test('Updating an issuer with publicKeys should replace jsonKeysUrl', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
    }, 10000);

    test('Updating an issuer displayName should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo', displayName: 'bar' });

      const issuer = await updateIssuer(account, issuerId, { displayName: 'biz' });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('foo');
      expect(issuer.data.publicKeys).toBeUndefined();
      expect(issuer.data.displayName).toBe('biz');
    }, 10000);

    test('Updating an issuer with three publicKey should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });
      const publicKeys = [
        { publicKey: 'bar', keyId: 'kid-0' },
        { publicKey: 'baz', keyId: 'kid-1' },
        { publicKey: 'bat', keyId: 'kid-2' },
      ];
      const issuer = await updateIssuer(account, issuerId, { publicKeys });
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
    }, 10000);

    test('Updating an issuer with a jsonKeysUrl and publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      const issuer = await updateIssuer(account, issuerId, { publicKeys, jsonKeysUrl: 'foo' });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe(`The issuer '${issuerId}' can not have both public keys and a json keys URL`);
    }, 10000);

    test('Updating an issuer with empty string jsonKeysUrl is be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { jsonKeysUrl: '' });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"jsonKeysUrl" is not allowed to be empty');
    }, 10000);

    test('Updating an issuer with empty string displayName is be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { displayName: '' });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"displayName" is not allowed to be empty');
    }, 10000);

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
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"publicKeys" must contain less than or equal to 3 items');
    }, 10000);

    test('Updating an issuer with no updated fields is a no-op', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, {});
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('foo');
      expect(issuer.data.publicKeys).toBeUndefined();
    }, 10000);

    test('Updating an issuer with an empty publicKeys array is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe(`"publicKeys" must contain at least 1 items`);
    }, 10000);

    test('Updating an issuer with a publicKey without a key id is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [{ publicKey: 'bar' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"keyId" is required');
    }, 10000);

    test('Updating an issuer with a publicKey with an empty key id is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [{ publicKey: 'bar', keyId: '' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"keyId" is not allowed to be empty');
    }, 10000);

    test('Updating an issuer with a publicKey without an actual publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [{ keyId: 'bar' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"publicKey" is required');
    }, 10000);

    test('Updating an issuer with a publicKey with an empty publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [{ keyId: 'bar', publicKey: '' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"publicKey" is not allowed to be empty');
    }, 10000);

    test('Updating a non-existing issuer should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];

      const issuer = await updateIssuer(account, issuerId, { publicKeys });
      expect(issuer.status).toBe(404);
      expect(issuer.data.status).toBe(404);
      expect(issuer.data.statusCode).toBe(404);
      expect(issuer.data.message).toBe(`The issuer '${issuerId}' is not associated with the account`);
    }, 10000);

    test('Getting an issuer with a non-existing account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys });

      const issuer = await updateIssuer(invalidAccount, issuerId, { publicKeys });
      expect(issuer.status).toBe(404);
      expect(issuer.data.status).toBe(404);
      expect(issuer.data.statusCode).toBe(404);

      const message = issuer.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 10000);
  });
});
