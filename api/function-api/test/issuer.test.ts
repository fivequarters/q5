import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addIssuer, listIssuers, getIssuer, updateIssuer, removeIssuer, cleanUpIssuers } from './sdk';

let account: IAccount = FakeAccount;
let invalidAccount: IAccount = FakeAccount;
let testRunId: string = '00000';

beforeAll(async () => {
  account = await resolveAccount();
  invalidAccount = {
    accountId: 'acc-9999999999999999',
    subscriptionId: account.subscriptionId,
    baseUrl: account.baseUrl,
    accessToken: account.accessToken,
  };
  testRunId = random() as string;
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

    test('Adding an issuer with an empty publicKeys array is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe(`The issuer '${issuerId}' can not have an empty array of public keys`);
    }, 10000);

    test('Adding an issuer with a publicKey without a key id is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [{ publicKey: 'bar' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"keyId" is required');
    }, 10000);

    test('Adding an issuer with a publicKey without an actual publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await addIssuer(account, issuerId, { publicKeys: [{ keyId: 'bar' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"publicKey" is required');
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

  describe('List', () => {
    test('Listing all issuers should return issuers', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-1a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 1a` }),
        addIssuer(account, `${issuerId}-1b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 1b` }),
        addIssuer(account, `${issuerId}-1c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 1c` }),
        addIssuer(account, `${issuerId}-1d`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 1d` }),
        addIssuer(account, `${issuerId}-1e`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 1e` }),
      ]);
      const result = await listIssuers(account);
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBeGreaterThanOrEqual(5);
    }, 10000);

    test('Listing all issuers filtered by name should return only filtered issuers', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-2a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 2a` }),
        addIssuer(account, `${issuerId}-2b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 2b` }),
        addIssuer(account, `${issuerId}-2c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 2c` }),
        addIssuer(account, `${issuerId}-2d`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 2d` }),
        addIssuer(account, `${issuerId}-2e`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 2e` }),
      ]);
      const result = await listIssuers(account, undefined, undefined, `${testRunId} - 2`);
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(5);
      const lookup: any = {};

      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;
        expect(item.jsonKeysUrl).toBe('foo');
        expect(item.displayName.indexOf(`test: ${testRunId} - 2`)).toBe(0);
        expect(item.id.indexOf(`${issuerId}-2`)).toBe(0);
      }
    }, 10000);

    test('Listing all issuers with a count and next should work', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-3a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 3a` }),
        addIssuer(account, `${issuerId}-3b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 3b` }),
        addIssuer(account, `${issuerId}-3c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 3c` }),
        addIssuer(account, `${issuerId}-3d`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 3d` }),
        addIssuer(account, `${issuerId}-3e`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 3e` }),
      ]);
      const result1 = await listIssuers(account, 3, undefined, `${testRunId} - 3`);
      expect(result1.status).toBe(200);
      expect(result1.data.items.length).toBe(3);
      expect(result1.data.next).toBeDefined();

      const result2 = await listIssuers(account, undefined, result1.data.next, `${testRunId} - 3`);
      expect(result2.status).toBe(200);
      expect(result2.data.items.length).toBe(2);
      expect(result2.data.next).toBeUndefined();

      const items = [...result1.data.items, ...result2.data.items];

      const lookup: any = {};
      for (const item of items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;

        expect(item.jsonKeysUrl).toBe('foo');
        expect(item.displayName.indexOf(`test: ${testRunId} - 3`)).toBe(0);
        expect(item.id.indexOf(`${issuerId}-3`)).toBe(0);
      }
    }, 10000);

    test('Listing all issuers with a count of 1 and next should work', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-4a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 4a` }),
        addIssuer(account, `${issuerId}-4b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 4b` }),
        addIssuer(account, `${issuerId}-4c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 4c` }),
      ]);
      const result1 = await listIssuers(account, 1, undefined, `${testRunId} - 4`);
      expect(result1.status).toBe(200);
      expect(result1.data.items.length).toBe(1);
      expect(result1.data.next).toBeDefined();

      const result2 = await listIssuers(account, 1, result1.data.next, `${testRunId} - 4`);
      expect(result2.status).toBe(200);
      expect(result2.data.items.length).toBe(1);
      expect(result2.data.next).toBeDefined();

      const result3 = await listIssuers(account, 1, result2.data.next, `${testRunId} - 4`);
      expect(result3.status).toBe(200);
      expect(result3.data.items.length).toBe(1);
      expect(result3.data.next).toBeDefined();

      const result4 = await listIssuers(account, 1, result3.data.next, `${testRunId} - 4`);
      expect(result4.status).toBe(200);
      expect(result4.data.items.length).toBe(0);
      expect(result4.data.next).toBeUndefined();

      const items = [...result1.data.items, ...result2.data.items, ...result3.data.items];

      const lookup: any = {};
      for (const item of items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;

        expect(item.jsonKeysUrl).toBe('foo');
        expect(item.displayName.indexOf(`test: ${testRunId} - 4`)).toBe(0);
        expect(item.id.indexOf(`${issuerId}-4`)).toBe(0);
      }
    }, 20000);

    test('Listing all issuers with a count of 0 should use default count', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-5a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5a` }),
        addIssuer(account, `${issuerId}-5b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5b` }),
        addIssuer(account, `${issuerId}-5c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5c` }),
      ]);
      const result = await listIssuers(account, 0, undefined, `${testRunId} - 5`);
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;

        expect(item.jsonKeysUrl).toBe('foo');
        expect(item.displayName.indexOf(`test: ${testRunId} - 5`)).toBe(0);
        expect(item.id.indexOf(`${issuerId}-5`)).toBe(0);
      }
    }, 10000);

    test('Listing all issuers with a negative count should return an error', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-5a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5a` }),
        addIssuer(account, `${issuerId}-5b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5b` }),
        addIssuer(account, `${issuerId}-5c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 5c` }),
      ]);
      const result = await listIssuers(account, -5, undefined, `${testRunId} - 5`);
      expect(result.status).toBe(400);
      expect(result.data.status).toBe(400);
      expect(result.data.statusCode).toBe(400);
      expect(result.data.message).toBe("The limit value '-5' is invalid; must be a positive number");
    }, 10000);

    test('Listing all issuers with an overly large count should use default max count', async () => {
      const issuerId = `test-${random()}`;
      await Promise.all([
        addIssuer(account, `${issuerId}-6a`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 6a` }),
        addIssuer(account, `${issuerId}-6b`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 6b` }),
        addIssuer(account, `${issuerId}-6c`, { jsonKeysUrl: 'foo', displayName: `test: ${testRunId} - 6c` }),
      ]);
      const result = await listIssuers(account, 50000, undefined, `${testRunId} - 6`);
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(3);
      expect(result.data.next).toBeUndefined();

      const lookup: any = {};
      for (const item of result.data.items) {
        expect(lookup[item.id]).toBeUndefined();
        lookup[item.id] = item;

        expect(item.jsonKeysUrl).toBe('foo');
        expect(item.displayName.indexOf(`test: ${testRunId} - 6`)).toBe(0);
        expect(item.id.indexOf(`${issuerId}-6`)).toBe(0);
      }
    }, 10000);

    test('Listing an issuer with a non-existing account should return an error', async () => {
      const issuer = await listIssuers(invalidAccount);
      expect(issuer.status).toBe(404);
      expect(issuer.data.status).toBe(404);
      expect(issuer.data.statusCode).toBe(404);

      const message = issuer.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 10000);
  });

  describe('Get', () => {
    test('Getting an issuer with jsonKeysUrl should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await getIssuer(account, issuerId);
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('foo');
      expect(issuer.data.publicKeys).toBeUndefined();
      expect(issuer.data.displayName).toBeUndefined();
    }, 10000);

    test('Getting an issuer with publicKeys should be supported', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys, displayName: 'fuzz' });

      const issuer = await getIssuer(account, issuerId);
      expect(issuer.status).toBe(200);
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
      expect(issuer.data.displayName).toBe('fuzz');
    }, 10000);

    test('Getting a non-existing issuer should return an error', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await getIssuer(account, issuerId);
      expect(issuer.status).toBe(404);
      expect(issuer.data.status).toBe(404);
      expect(issuer.data.statusCode).toBe(404);
      expect(issuer.data.message).toBe(`The issuer '${issuerId}' is not associated with the account`);
    }, 10000);

    test('Getting an issuer with a non-existing account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys, displayName: 'fuzz' });

      const issuer = await getIssuer(invalidAccount, issuerId);
      expect(issuer.status).toBe(404);
      expect(issuer.data.status).toBe(404);
      expect(issuer.data.statusCode).toBe(404);

      const message = issuer.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 10000);
  });

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
      expect(issuer.data.message).toBe(`The issuer '${issuerId}' can not have an empty array of public keys`);
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

    test('Updating an issuer with a publicKey without an actual publicKey is not supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await updateIssuer(account, issuerId, { publicKeys: [{ keyId: 'bar' }] });
      expect(issuer.status).toBe(400);
      expect(issuer.data.status).toBe(400);
      expect(issuer.data.statusCode).toBe(400);
      expect(issuer.data.message).toBe('"publicKey" is required');
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

  describe('Remove', () => {
    test('Removing an issuer should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await removeIssuer(account, issuerId);
      expect(issuer.status).toBe(204);
      expect(issuer.data).toBeUndefined();
    }, 10000);

    test('Removing a non-existing issuer should return an error', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await removeIssuer(account, issuerId);
      expect(issuer.status).toBe(404);
      expect(issuer.data.status).toBe(404);
      expect(issuer.data.statusCode).toBe(404);
      expect(issuer.data.message).toBe(`The issuer '${issuerId}' is not associated with the account`);
    }, 10000);

    test('Getting an issuer with a non-existing account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys, displayName: 'fuzz' });

      const issuer = await removeIssuer(invalidAccount, issuerId);
      expect(issuer.status).toBe(404);
      expect(issuer.data.status).toBe(404);
      expect(issuer.data.statusCode).toBe(404);

      const message = issuer.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 10000);
  });
});
