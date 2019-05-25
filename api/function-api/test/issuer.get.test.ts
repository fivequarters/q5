import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addIssuer, getIssuer, cleanUpIssuers } from './sdk';

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
});
