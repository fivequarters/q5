import { random } from '@5qtrs/random';

import { getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addIssuer, getIssuer, cleanUpIssuers } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterEach(async () => {
  await cleanUpIssuers(account);
}, 180000);

describe('Issuer Get', () => {
  describe('Get', () => {
    test('Getting an issuer with jsonKeysUrl should be supported', async () => {
      const issuerId = `test-${random()}`;
      await addIssuer(account, issuerId, { jsonKeysUrl: 'foo' });

      const issuer = await getIssuer(account, issuerId);
      expect(issuer).toBeHttp({ statusCode: 200 });
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.jsonKeysUrl).toBe('foo');
      expect(issuer.data.publicKeys).toBeUndefined();
      expect(issuer.data.displayName).toBeUndefined();
    }, 180000);

    test('Getting an issuer with publicKeys should be supported', async () => {
      const issuerId = `test-${random()}`;
      const publicKeys = [{ publicKey: 'bar', keyId: 'kid-0' }];
      await addIssuer(account, issuerId, { publicKeys, displayName: 'fuzz' });

      const issuer = await getIssuer(account, issuerId);
      expect(issuer).toBeHttp({ statusCode: 200 });
      expect(issuer.data.id).toBe(issuerId);
      expect(issuer.data.publicKeys).toEqual(publicKeys);
      expect(issuer.data.displayName).toBe('fuzz');
    }, 180000);

    test('Getting a non-existing issuer should return an error', async () => {
      const issuerId = `test-${random()}`;
      const issuer = await getIssuer(account, issuerId);
      expect(issuer).toBeHttpError(404, `The issuer '${issuerId}' is not associated with the account`);
    }, 180000);

    test('Getting an issuer with an malformed account id should return an error', async () => {
      const malformed = await getMalformedAccount();
      const issuer = await getIssuer(malformed, `test-${random()}`);
      expect(issuer).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Getting an issuer with a non-existing account should return an error', async () => {
      const issuer = await getIssuer(await getNonExistingAccount(), `test-${random()}`);
      expect(issuer).toBeUnauthorizedError();
    }, 180000);
  });
});
