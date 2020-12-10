import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addIssuer, getIssuer, removeIssuer, cleanUpIssuers } from './sdk';
import './extendJest';

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpIssuers(account);
}, 180000);

describe('Issuer', () => {
  describe('Remove', () => {
    test('Removing an issuer should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await removeIssuer(account, issuerId);
      expect(issuer).toBeHttp({ statusCode: 204 });
      expect(issuer.data).toBeUndefined();

      const removed = await getIssuer(account, issuerId);
      expect(removed).toBeHttpError(404, `The issuer '${issuerId}' is not associated with the account`);
    }, 180000);

    test('Removing a non-existing issuer should return an error', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await removeIssuer(account, issuerId);
      expect(issuer).toBeHttpError(404, `The issuer '${issuerId}' is not associated with the account`);
    }, 180000);

    test('Getting an issuer with a malformed account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys, displayName: 'fuzz' });

      const malformed = await getMalformedAccount();
      const issuer = await removeIssuer(malformed, issuerId);
      expect(issuer).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Getting an issuer with a non-existing account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys, displayName: 'fuzz' });

      const issuer = await removeIssuer(await getNonExistingAccount(), issuerId);
      expect(issuer).toBeUnauthorizedError();
    }, 180000);
  });
});
