import { IAccount, FakeAccount, resolveAccount, getNonExistingAccount } from './accountResolver';
import { addUser, initUser, resolveInit, cleanUpUsers, cleanUpIssuers, createPKIAccessToken, addIssuer } from './sdk';
import { random } from '@5qtrs/random';
import { decodeJwt, decodeJwtHeader } from '@5qtrs/jwt';
import { createKeyPair, IKeyPairResult } from '@5qtrs/key-pair';
import { extendExpect } from './extendJest';

const expectMore = extendExpect(expect);

let account: IAccount = FakeAccount;
let issuerKeyPair: IKeyPairResult = { publicKey: '', privateKey: '' };
const issuerId = `test-${random()}`;
const issuerKeyId = 'kid-0';

beforeAll(async () => {
  account = await resolveAccount();
  issuerKeyPair = await createKeyPair();
  const issuer = await addIssuer(account, issuerId, {
    publicKeys: [
      {
        publicKey: issuerKeyPair.publicKey,
        keyId: issuerKeyId,
      },
    ],
  });
  expect(issuer.status).toBe(200);
});

afterAll(async () => {
  await cleanUpIssuers(account);
}, 180000);

afterEach(async () => {
  await cleanUpUsers(account);
}, 180000);

describe('User', () => {
  describe('Init OAuth', () => {
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
      const request = {
        protocol: 'oauth',
        profile: {
          oauth: {
            webAuthorizationUrl: 'https://fusebit.io',
            webClientId: 'abc',
            webLogoutUrl: 'https://fusebit.io',
            deviceAuthorizationUrl: 'https://fusebit.io',
            deviceClientId: 'def',
            tokenUrl: 'https://fusebit.io',
          },
        },
      };
      const user = await initUser(account, original.data.id, request);
      expect(user.status).toBe(200);

      const jwt = user.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.protocol).toBe('oauth');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.profile).toBeDefined();
      expect(decoded.profile.account).toBe(account.accountId);
      expect(decoded.profile.baseUrl).toBe(account.baseUrl);
      expect(decoded.profile.issuerId).toBeUndefined();
      expect(decoded.profile.subject).toBeUndefined();
      expect(decoded.profile.oauth).toBeDefined();
      expect(decoded.profile.oauth).toStrictEqual(request.profile.oauth);
      expect(decoded.iss).toBe(account.audience);
      expect(decoded.aud).toBe(account.audience);

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 10);
      expect(decoded.iat).toBeLessThan(now + 10);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 10);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 10);
    }, 180000);

    test('Getting an init token with id and displayName should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        identities,
        access,
      });
      const request = {
        protocol: 'oauth',
        profile: {
          id: 'profile-id',
          displayName: 'display-name',
          oauth: {
            webAuthorizationUrl: 'https://fusebit.io',
            webClientId: 'abc',
            webLogoutUrl: 'https://fusebit.io',
            deviceAuthorizationUrl: 'https://fusebit.io',
            deviceClientId: 'def',
            tokenUrl: 'https://fusebit.io',
          },
        },
      };
      const user = await initUser(account, original.data.id, request);
      expect(user.status).toBe(200);

      const jwt = user.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.protocol).toBe('oauth');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.profile).toBeDefined();
      expect(decoded.profile.id).toBe('profile-id');
      expect(decoded.profile.displayName).toBe('display-name');
      expect(decoded.profile.account).toBe(account.accountId);
      expect(decoded.profile.baseUrl).toBe(account.baseUrl);
      expect(decoded.profile.issuerId).toBeUndefined();
      expect(decoded.profile.subject).toBeUndefined();
      expect(decoded.profile.oauth).toBeDefined();
      expect(decoded.profile.oauth).toStrictEqual(request.profile.oauth);
      expect(decoded.iss).toBe(account.audience);
      expect(decoded.aud).toBe(account.audience);

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 10);
      expect(decoded.iat).toBeLessThan(now + 10);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 10);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 10);
    }, 180000);

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
      const request = {
        protocol: 'oauth',
        profile: {
          subscription: account.subscriptionId,
          oauth: {
            webAuthorizationUrl: 'https://fusebit.io',
            webClientId: 'abc',
            webLogoutUrl: 'https://fusebit.io',
            deviceAuthorizationUrl: 'https://fusebit.io',
            deviceClientId: 'def',
            tokenUrl: 'https://fusebit.io',
          },
        },
      };
      const user = await initUser(account, original.data.id, request);
      expect(user.status).toBe(200);

      const jwt = user.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.protocol).toBe('oauth');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.profile).toBeDefined();
      expect(decoded.profile.account).toBe(account.accountId);
      expect(decoded.profile.subscription).toBe(account.subscriptionId);
      expect(decoded.profile.baseUrl).toBe(account.baseUrl);
      expect(decoded.profile.issuerId).toBeUndefined();
      expect(decoded.profile.subject).toBeUndefined();
      expect(decoded.profile.oauth).toBeDefined();
      expect(decoded.profile.oauth).toStrictEqual(request.profile.oauth);
      expect(decoded.iss).toBe(account.audience);
      expect(decoded.aud).toBe(account.audience);

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 10);
      expect(decoded.iat).toBeLessThan(now + 10);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 10);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 10);
    }, 180000);

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
      const request = {
        protocol: 'oauth',
        profile: {
          subscription: account.subscriptionId,
          boundary: 'boundary-abc',
          oauth: {
            webAuthorizationUrl: 'https://fusebit.io',
            webClientId: 'abc',
            webLogoutUrl: 'https://fusebit.io',
            deviceAuthorizationUrl: 'https://fusebit.io',
            deviceClientId: 'def',
            tokenUrl: 'https://fusebit.io',
          },
        },
      };
      const user = await initUser(account, original.data.id, request);
      expect(user.status).toBe(200);

      const jwt = user.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.protocol).toBe('oauth');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.profile).toBeDefined();
      expect(decoded.profile.account).toBe(account.accountId);
      expect(decoded.profile.subscription).toBe(account.subscriptionId);
      expect(decoded.profile.boundary).toBe('boundary-abc');
      expect(decoded.profile.baseUrl).toBe(account.baseUrl);
      expect(decoded.profile.issuerId).toBeUndefined();
      expect(decoded.profile.subject).toBeUndefined();
      expect(decoded.profile.oauth).toBeDefined();
      expect(decoded.profile.oauth).toStrictEqual(request.profile.oauth);
      expect(decoded.iss).toBe(account.audience);
      expect(decoded.aud).toBe(account.audience);

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 10);
      expect(decoded.iat).toBeLessThan(now + 10);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 10);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 10);
    }, 180000);

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
      const request = {
        protocol: 'oauth',
        profile: {
          subscription: account.subscriptionId,
          boundary: 'boundary-abc',
          function: 'function-abc',
          oauth: {
            webAuthorizationUrl: 'https://fusebit.io',
            webClientId: 'abc',
            webLogoutUrl: 'https://fusebit.io',
            deviceAuthorizationUrl: 'https://fusebit.io',
            deviceClientId: 'def',
            tokenUrl: 'https://fusebit.io',
          },
        },
      };
      const user = await initUser(account, original.data.id, request);
      expect(user.status).toBe(200);

      const jwt = user.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.protocol).toBe('oauth');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.profile).toBeDefined();
      expect(decoded.profile.account).toBe(account.accountId);
      expect(decoded.profile.subscription).toBe(account.subscriptionId);
      expect(decoded.profile.boundary).toBe('boundary-abc');
      expect(decoded.profile.function).toBe('function-abc');
      expect(decoded.profile.baseUrl).toBe(account.baseUrl);
      expect(decoded.profile.issuerId).toBeUndefined();
      expect(decoded.profile.subject).toBeUndefined();
      expect(decoded.profile.oauth).toBeDefined();
      expect(decoded.profile.oauth).toStrictEqual(request.profile.oauth);
      expect(decoded.iss).toBe(account.audience);
      expect(decoded.aud).toBe(account.audience);

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 10);
      expect(decoded.iat).toBeLessThan(now + 10);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 10);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 10);
    }, 180000);

    test('Getting an init token without profile should fail', async () => {
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
        protocol: 'oauth',
      });
      expectMore(user).toBeHttpError(400, `"profile" is required`);
    }, 180000);
  });

  describe('Resolve OAuth', () => {
    test('Resolving an init token should be supported', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const jwt = user.data;
      const accessToken = await createPKIAccessToken(issuerKeyPair, issuerKeyId, issuerId, 'user-1', account.baseUrl);

      const resolved = await resolveInit(account, jwt, { protocol: 'oauth', accessToken });
      expect(resolved.status).toBe(200);
      expect(resolved.data.id).toBe(original.data.id);
      expect(resolved.data.firstName).toBe('first');
      expect(resolved.data.lastName).toBe('last');
      expect(resolved.data.primaryEmail).toBe('email');
      expect(resolved.data.identities).toBeDefined();
      expect(resolved.data.identities.length).toBe(1);
      expect(resolved.data.identities[0].issuerId).toBe(issuerId);
      expect(resolved.data.identities[0].subject).toBe('user-1');
      expect(resolved.data.access).toEqual(access);
    }, 180000);

    test('Resolving an init token with invalid protocol should fail', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const jwt = user.data;

      const resolved = await resolveInit(account, jwt, { protocol: 'none' });
      expectMore(resolved).toBeHttpError(400, '"protocol" must be one of [pki, oauth]');
    }, 180000);

    test('Resolving an init token with no accessToken returns an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const jwt = user.data;

      const resolved = await resolveInit(account, jwt, { protocol: 'oauth' });
      expectMore(resolved).toBeHttpError(400, '"accessToken" is required');
    }, 180000);

    test('Resolving an init token with no jwt returns an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      await initUser(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const accessToken = await createPKIAccessToken(issuerKeyPair, issuerKeyId, issuerId, 'user-1', account.baseUrl);

      const resolved = await resolveInit(account, undefined, {
        protocol: 'oauth',
        accessToken,
      });

      expectMore(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with a non-existing account should return an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const jwt = user.data;
      const accessToken = await createPKIAccessToken(issuerKeyPair, issuerKeyId, issuerId, 'user-1', account.baseUrl);
      const resolved = await resolveInit(await getNonExistingAccount(), jwt, {
        protocol: 'oauth',
        accessToken,
      });

      expectMore(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with non-jwt should return an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      await initUser(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const accessToken = await createPKIAccessToken(issuerKeyPair, issuerKeyId, issuerId, 'user-1', account.baseUrl);

      const resolved = await resolveInit(account, 'not a jwt', {
        protocol: 'oauth',
        accessToken,
      });

      expectMore(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token using an access token with untrusted issuerId should return an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = user.data;
      const accessToken = await createPKIAccessToken(
        issuerKeyPair,
        issuerKeyId,
        'unrecognized issuer Id',
        'user-1',
        account.baseUrl
      );
      const resolved = await resolveInit(account, jwt, {
        protocol: 'oauth',
        accessToken,
      });
      expectMore(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token using an access token with unrecognized keyId should return an error', async () => {
      const access = { allow: [{ action: 'user:*', resource: '/account/abc/' }] };
      const original = await addUser(account, {
        firstName: 'first',
        lastName: 'last',
        primaryEmail: 'email',
        access,
      });
      const user = await initUser(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = user.data;
      const accessToken = await createPKIAccessToken(
        issuerKeyPair,
        'unrecognized-key-id',
        issuerId,
        'user-1',
        account.baseUrl
      );
      const resolved = await resolveInit(account, jwt, {
        protocol: 'oauth',
        accessToken,
      });
      expectMore(resolved).toBeUnauthorizedError();
    }, 180000);
  });
});
