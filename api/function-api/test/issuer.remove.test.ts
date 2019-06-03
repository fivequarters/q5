import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addIssuer, getIssuer, removeIssuer, cleanUpIssuers } from './sdk';
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
  describe('Remove', () => {
    test('Removing an issuer should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await removeIssuer(account, issuerId);
      expect(issuer.status).toBe(204);
      expect(issuer.data).toBeUndefined();

      const removed = await getIssuer(account, issuerId);
      expectMore(removed).toBeHttpError(404, `The issuer '${issuerId}' is not associated with the account`);
    }, 10000);

    test('Removing a non-existing issuer should return an error', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await removeIssuer(account, issuerId);
      expectMore(issuer).toBeHttpError(404, `The issuer '${issuerId}' is not associated with the account`);
    }, 10000);

    test('Getting an issuer with a malformed account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys, displayName: 'fuzz' });

      const malformed = await getMalformedAccount();
      const issuer = await removeIssuer(malformed, issuerId);
      expectMore(issuer).toBeMalformedAccountError(malformed.accountId);
    }, 10000);

    test('Getting an issuer with a non-existing account should return an error', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys, displayName: 'fuzz' });

      const issuer = await removeIssuer(await getNonExistingAccount(), issuerId);
      expectMore(issuer).toBeUnauthorizedError();
    }, 10000);
  });
});
