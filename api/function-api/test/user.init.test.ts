import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addUser, initUser, resolveInit, cleanUpUsers } from './sdk';
import { random } from '@5qtrs/random';
import { decodeJwt, decodeJwtHeader, signJwt } from '@5qtrs/jwt';
import { createKeyPair } from '@5qtrs/key-pair';

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
  await cleanUpUsers(account);
}, 20000);

describe('User', () => {
  describe('Init', () => {
    test('Getting an init token should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });
      const user = await initUser(account, original.data.id);
      expect(user.status).toBe(200);

      const jwt = user.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.accountId).toBe(account.accountId);
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.baseUrl).toBe(account.baseUrl);
      expect(decoded.iss).toBe(account.baseUrl);
      expect(decoded.aud).toBe(account.baseUrl);
      expect(decoded.issuerId).toBeDefined();
      expect(decoded.subject).toBeDefined();

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 5);
      expect(decoded.iat).toBeLessThan(now + 5);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 5);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 5);
    }, 20000);

    test('Getting an init token with a subscriptionId set should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });
      const user = await initUser(account, original.data.id, { subscriptionId: account.subscriptionId });
      expect(user.status).toBe(200);

      const jwt = user.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.accountId).toBe(account.accountId);
      expect(decoded.subscriptionId).toBe(account.subscriptionId);
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.baseUrl).toBe(account.baseUrl);
      expect(decoded.issuerId).toBeDefined();
      expect(decoded.subject).toBeDefined();

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 5);
      expect(decoded.iat).toBeLessThan(now + 5);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 5);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 5);
    }, 20000);

    test('Getting an init token with a boundaryId set should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });
      const user = await initUser(account, original.data.id, {
        subscriptionId: account.subscriptionId,
        boundaryId: 'boundary-abc',
      });
      expect(user.status).toBe(200);

      const jwt = user.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.accountId).toBe(account.accountId);
      expect(decoded.subscriptionId).toBe(account.subscriptionId);
      expect(decoded.boundaryId).toBe('boundary-abc');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.baseUrl).toBe(account.baseUrl);
      expect(decoded.issuerId).toBeDefined();
      expect(decoded.subject).toBeDefined();

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 5);
      expect(decoded.iat).toBeLessThan(now + 5);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 5);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 5);
    }, 20000);

    test('Getting an init token with a functionId set should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });
      const user = await initUser(account, original.data.id, {
        subscriptionId: account.subscriptionId,
        boundaryId: 'boundary-abc',
        functionId: 'function-abc',
      });
      expect(user.status).toBe(200);

      const jwt = user.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.accountId).toBe(account.accountId);
      expect(decoded.subscriptionId).toBe(account.subscriptionId);
      expect(decoded.boundaryId).toBe('boundary-abc');
      expect(decoded.functionId).toBe('function-abc');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.baseUrl).toBe(account.baseUrl);
      expect(decoded.issuerId).toBeDefined();
      expect(decoded.subject).toBeDefined();

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 5);
      expect(decoded.iat).toBeLessThan(now + 5);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 5);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 5);
    }, 20000);

    test('Getting an init token with an invalid user id should return an error', async () => {
      const userId = `usr-${random()}`;
      const user = await initUser(account, userId);
      expect(user.status).toBe(400);
      expect(user.data.status).toBe(400);
      expect(user.data.statusCode).toBe(400);
      expect(user.data.message).toBe(
        `"userId" with value "${userId}" fails to match the required pattern: /^usr-[a-g0-9]{16}$/`
      );
    }, 20000);

    test('Getting a non-existing user should return an error', async () => {
      const userId = `usr-${random({ lengthInBytes: 8 })}`;
      const user = await initUser(account, userId);
      expect(user.status).toBe(404);
      expect(user.data.status).toBe(404);
      expect(user.data.statusCode).toBe(404);
      expect(user.data.message).toBe(`The user '${userId}' does not exist`);
    }, 20000);

    test('Getting an init token with a non-existing account should return an error', async () => {
      const original = await addUser(account, {});
      const user = await initUser(invalidAccount, original.data.id);
      expect(user.status).toBe(404);
      expect(user.data.status).toBe(404);
      expect(user.data.statusCode).toBe(404);

      const message = user.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 10000);
  });

  describe('Resolve', () => {
    test('Resolving an init token should be supported', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id);
      const jwt = user.data;
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved.status).toBe(200);
      expect(resolved.data.id).toBe(original.data.id);
      expect(resolved.data.firstName).toBe('first');
      expect(resolved.data.lastName).toBe('last');
      expect(resolved.data.primaryEmail).toBe('email');
      expect(resolved.data.identities).toBeDefined();
      expect(resolved.data.identities.length).toBe(1);
      expect(resolved.data.identities[0].issuerId).toBeDefined();
      expect(resolved.data.identities[0].subject).toBeDefined();
      expect(resolved.data.access).toEqual(access);
    }, 20000);

    test('Resolving an init token with no publicKey returns an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id);
      const jwt = user.data;
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { keyId });
      expect(resolved.status).toBe(400);
      expect(resolved.data.status).toBe(400);
      expect(resolved.data.statusCode).toBe(400);
      expect(resolved.data.message).toBe('"publicKey" is required');
    }, 20000);

    test('Resolving an init token with no keyId returns an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id);
      const jwt = user.data;
      const keyPair = await createKeyPair();

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey });
      expect(resolved.status).toBe(400);
      expect(resolved.data.status).toBe(400);
      expect(resolved.data.statusCode).toBe(400);
      expect(resolved.data.message).toBe('"keyId" is required');
    }, 20000);

    test('Resolving an init token with no jwt returns an error', async () => {
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, undefined, { publicKey: keyPair.publicKey, keyId });
      expect(resolved.status).toBe(403);
      expect(resolved.data.status).toBe(403);
      expect(resolved.data.statusCode).toBe(403);
      expect(resolved.data.message).toBe('Unauthorized');
    }, 20000);

    test('Resolving an init token with a non-existing account should return an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id);
      const jwt = user.data;
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(invalidAccount, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved.status).toBe(404);
      expect(resolved.data.status).toBe(404);
      expect(resolved.data.statusCode).toBe(404);
      expect(resolved.data.message).toBe(`The user '${original.data.id}' does not exist`);
    }, 10000);

    test('Resolving an init token with non-jwt should return an error', async () => {
      const jwt = 'not a jwt';
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved.status).toBe(403);
      expect(resolved.data.status).toBe(403);
      expect(resolved.data.statusCode).toBe(403);
      expect(resolved.data.message).toBe('Unauthorized');
    }, 10000);

    test('Resolving an init token with a jwt missing an accountId should return an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const jwt = await signJwt({ agentId: original.data.id }, 'a secret');
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved.status).toBe(403);
      expect(resolved.data.status).toBe(403);
      expect(resolved.data.statusCode).toBe(403);
      expect(resolved.data.message).toBe('Unauthorized');
    }, 10000);

    test('Resolving an init token with a jwt missing an agentId should return an error', async () => {
      const jwt = await signJwt({ accountId: account.accountId }, 'a secret');
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved.status).toBe(403);
      expect(resolved.data.status).toBe(403);
      expect(resolved.data.statusCode).toBe(403);
      expect(resolved.data.message).toBe('Unauthorized');
    }, 10000);

    test('Resolving an init token with a cloned and signed jwt returns an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id);
      const decoded = decodeJwt(user.data, true);
      const jwt = await signJwt(decoded, 'a secret');
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved.status).toBe(403);
      expect(resolved.data.status).toBe(403);
      expect(resolved.data.statusCode).toBe(403);
      expect(resolved.data.message).toBe('Unauthorized');
    }, 10000);
  });
});
