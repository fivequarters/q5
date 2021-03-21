import { random } from '@5qtrs/random';
import { decodeJwt, decodeJwtHeader } from '@5qtrs/jwt';
import { createKeyPair, IKeyPairResult } from '@5qtrs/key-pair';

import { getNonExistingAccount } from './accountResolver';
import {
  addClient,
  initClient,
  resolveInit,
  cleanUpClients,
  cleanUpIssuers,
  createPKIAccessToken,
  addIssuer,
} from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

let issuerKeyPair: IKeyPairResult = { publicKey: '', privateKey: '' };
const issuerId = `test-${random()}`;
const issuerKeyId = 'kid-0';

beforeAll(async () => {
  ({ account } = getEnv());
  issuerKeyPair = await createKeyPair();
  const issuer = await addIssuer(account, issuerId, {
    publicKeys: [
      {
        publicKey: issuerKeyPair.publicKey,
        keyId: issuerKeyId,
      },
    ],
  });
  expect(issuer).toBeHttp({ statusCode: 200 });
});

afterAll(async () => {
  await cleanUpIssuers(account);
}, 180000);

afterEach(async () => {
  await cleanUpClients(account);
}, 180000);

describe('User Init OAuth', () => {
  describe('Init OAuth', () => {
    test('Getting an init token should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
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
      const client = await initClient(account, original.data.id, request);
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

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
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
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
      const client = await initClient(account, original.data.id, request);
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

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
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
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
      const client = await initClient(account, original.data.id, request);
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

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
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
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
      const client = await initClient(account, original.data.id, request);
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

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
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
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
      const client = await initClient(account, original.data.id, request);
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

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
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        identities,
        access,
      });
      const client = await initClient(account, original.data.id, {
        protocol: 'oauth',
      });
      expect(client).toBeHttpError(400, `"profile" is required`);
    }, 180000);
  });

  describe('Resolve OAuth', () => {
    test('Resolving an init token should be supported', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const jwt = client.data;
      const accessToken = await createPKIAccessToken(issuerKeyPair, issuerKeyId, issuerId, 'client-1', account.baseUrl);

      const resolved = await resolveInit(account, jwt, { protocol: 'oauth', accessToken });
      expect(resolved).toBeHttp({ statusCode: 200 });
      expect(resolved.data.id).toBe(original.data.id);
      expect(resolved.data.displayName).toBe('display');
      expect(resolved.data.identities).toBeDefined();
      expect(resolved.data.identities.length).toBe(1);
      expect(resolved.data.identities[0].issuerId).toBe(issuerId);
      expect(resolved.data.identities[0].subject).toBe('client-1');
      expect(resolved.data.access).toEqual(access);
    }, 180000);

    test('Resolving an init token with invalid protocol should fail', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const jwt = client.data;

      const resolved = await resolveInit(account, jwt, { protocol: 'none' });
      expect(resolved).toBeHttpError(400, '"protocol" must be one of [pki, oauth]');
    }, 180000);

    test('Resolving an init token with no accessToken returns an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const jwt = client.data;

      const resolved = await resolveInit(account, jwt, { protocol: 'oauth' });
      expect(resolved).toBeHttpError(400, '"accessToken" is required');
    }, 180000);

    test('Resolving an init token with no jwt returns an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        access,
      });
      await initClient(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const accessToken = await createPKIAccessToken(issuerKeyPair, issuerKeyId, issuerId, 'client-1', account.baseUrl);

      const resolved = await resolveInit(account, undefined, {
        protocol: 'oauth',
        accessToken,
      });

      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with a non-existing account should return an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const jwt = client.data;
      const accessToken = await createPKIAccessToken(issuerKeyPair, issuerKeyId, issuerId, 'client-1', account.baseUrl);
      const resolved = await resolveInit(await getNonExistingAccount(), jwt, {
        protocol: 'oauth',
        accessToken,
      });

      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with non-jwt should return an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        access,
      });
      await initClient(account, original.data.id, { protocol: 'oauth', profile: { oauth: {} } });
      const accessToken = await createPKIAccessToken(issuerKeyPair, issuerKeyId, issuerId, 'client-1', account.baseUrl);

      const resolved = await resolveInit(account, 'not a jwt', {
        protocol: 'oauth',
        accessToken,
      });

      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token using an access token with untrusted issuerId should return an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = client.data;
      const accessToken = await createPKIAccessToken(
        issuerKeyPair,
        issuerKeyId,
        'unrecognized issuer Id',
        'client-1',
        account.baseUrl
      );
      const resolved = await resolveInit(account, jwt, {
        protocol: 'oauth',
        accessToken,
      });
      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token using an access token with unrecognized keyId should return an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = client.data;
      const accessToken = await createPKIAccessToken(
        issuerKeyPair,
        'unrecognized-key-id',
        issuerId,
        'client-1',
        account.baseUrl
      );
      const resolved = await resolveInit(account, jwt, {
        protocol: 'oauth',
        accessToken,
      });
      expect(resolved).toBeUnauthorizedError();
    }, 180000);
  });
});
