import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addIssuer, getIssuer, cleanUpIssuers } from './sdk';
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
      expectMore(issuer).toBeHttpError(404, `The issuer '${issuerId}' is not associated with the account`);
    }, 10000);

    test('Getting an issuer with an malformed account id should return an error', async () => {
      const malformed = await getMalformedAccount();
      const issuer = await getIssuer(malformed, `test-${random()}`);
      expectMore(issuer).toBeMalformedAccountError(malformed.accountId);
    }, 10000);

    test('Getting an issuer with a non-existing account should return an error', async () => {
      const issuer = await getIssuer(await getNonExistingAccount(), `test-${random()}`);
      expectMore(issuer).toBeUnauthorizedError();
    }, 10000);
  });
});
