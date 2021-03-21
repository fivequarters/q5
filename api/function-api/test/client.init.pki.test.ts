import { random } from '@5qtrs/random';
import { decodeJwt, decodeJwtHeader, signJwt } from '@5qtrs/jwt';
import { createKeyPair } from '@5qtrs/key-pair';

import { getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addClient, initClient, resolveInit, cleanUpClients, createPKIAccessToken } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterEach(async () => {
  await cleanUpClients(account);
}, 180000);

describe('Client Init PKI', () => {
  describe('Init PKI', () => {
    test('Getting an init token should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        identities,
        access,
      });
      const client = await initClient(account, original.data.id, {
        protocol: 'pki',
        profile: {},
      });
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.protocol).toBe('pki');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.profile).toBeDefined();
      expect(decoded.profile.account).toBe(account.accountId);
      expect(decoded.profile.baseUrl).toBe(account.baseUrl);
      expect(decoded.profile.issuerId).toBeDefined();
      expect(decoded.profile.subject).toBeDefined();
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
      const client = await initClient(account, original.data.id, {
        protocol: 'pki',
        profile: {
          id: 'profile-id',
          displayName: 'display-name',
        },
      });
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.protocol).toBe('pki');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.profile).toBeDefined();
      expect(decoded.profile.id).toBe('profile-id');
      expect(decoded.profile.displayName).toBe('display-name');
      expect(decoded.profile.account).toBe(account.accountId);
      expect(decoded.profile.baseUrl).toBe(account.baseUrl);
      expect(decoded.profile.issuerId).toBeDefined();
      expect(decoded.profile.subject).toBeDefined();
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
      const client = await initClient(account, original.data.id, {
        protocol: 'pki',
        profile: { subscription: account.subscriptionId },
      });
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.protocol).toBe('pki');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.profile).toBeDefined();
      expect(decoded.profile.account).toBe(account.accountId);
      expect(decoded.profile.subscription).toBe(account.subscriptionId);
      expect(decoded.profile.baseUrl).toBe(account.baseUrl);
      expect(decoded.profile.issuerId).toBeDefined();
      expect(decoded.profile.subject).toBeDefined();
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
      const client = await initClient(account, original.data.id, {
        protocol: 'pki',
        profile: { subscription: account.subscriptionId, boundary: 'boundary-abc' },
      });
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.protocol).toBe('pki');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.profile).toBeDefined();
      expect(decoded.profile.account).toBe(account.accountId);
      expect(decoded.profile.subscription).toBe(account.subscriptionId);
      expect(decoded.profile.boundary).toBe('boundary-abc');
      expect(decoded.profile.baseUrl).toBe(account.baseUrl);
      expect(decoded.profile.issuerId).toBeDefined();
      expect(decoded.profile.subject).toBeDefined();
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
      const client = await initClient(account, original.data.id, {
        protocol: 'pki',
        profile: { subscription: account.subscriptionId, boundary: 'boundary-abc', function: 'function-abc' },
      });
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.protocol).toBe('pki');
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.profile).toBeDefined();
      expect(decoded.profile.account).toBe(account.accountId);
      expect(decoded.profile.subscription).toBe(account.subscriptionId);
      expect(decoded.profile.boundary).toBe('boundary-abc');
      expect(decoded.profile.function).toBe('function-abc');
      expect(decoded.profile.baseUrl).toBe(account.baseUrl);
      expect(decoded.profile.issuerId).toBeDefined();
      expect(decoded.profile.subject).toBeDefined();
      expect(decoded.iss).toBe(account.audience);
      expect(decoded.aud).toBe(account.audience);

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 10);
      expect(decoded.iat).toBeLessThan(now + 10);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 10);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 10);
    }, 180000);

    test('Getting an init token with invalid protocol should fail', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        identities,
        access,
      });
      const client = await initClient(account, original.data.id, {
        protocol: 'foo',
      });
      expect(client).toBeHttpError(400, `"protocol" must be one of [pki, oauth]`);
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
        protocol: 'pki',
      });
      expect(client).toBeHttpError(400, `"profile" is required`);
    }, 180000);

    test('Getting an init token with an invalid client id should return an error', async () => {
      const clientId = `clt-${random()}`;
      const client = await initClient(account, clientId, { protocol: 'pki', profile: {} });
      expect(client).toBeHttpError(
        400,
        `"clientId" with value "${clientId}" fails to match the required pattern: /^clt-[a-g0-9]{16}$/`
      );
    }, 180000);

    test('Getting a non-existing client should return an error', async () => {
      const clientId = `clt-${random({ lengthInBytes: 8 })}`;
      const client = await initClient(account, clientId, { protocol: 'pki', profile: {} });
      expect(client).toBeHttpError(404, `The client '${clientId}' does not exist`);
    }, 180000);

    test('Getting an init token with a malformed account account should return an error', async () => {
      const malformed = await getMalformedAccount();
      const original = await addClient(account, {});
      const client = await initClient(malformed, original.data.id, { protocol: 'pki', profile: {} });
      expect(client).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Getting an init token with a non-existing account should return an error', async () => {
      const original = await addClient(account, {});
      const client = await initClient(await getNonExistingAccount(), original.data.id, {
        protocol: 'pki',
        profile: {},
      });
      expect(client).toBeUnauthorizedError();
    }, 180000);
  });

  describe('Resolve PKI', () => {
    test('Resolving an init token should be supported', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = client.data;
      const initToken = decodeJwt(jwt, true);
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;
      const accessToken = await createPKIAccessToken(
        keyPair,
        keyId,
        initToken.profile.issuerId,
        initToken.profile.subject,
        account.baseUrl
      );

      const resolved = await resolveInit(account, jwt, { protocol: 'pki', publicKey: keyPair.publicKey, accessToken });
      expect(resolved).toBeHttp({ statusCode: 200 });
      expect(resolved.data.id).toBe(original.data.id);
      expect(resolved.data.displayName).toBe('display');
      expect(resolved.data.identities).toBeDefined();
      expect(resolved.data.identities.length).toBe(1);
      expect(resolved.data.identities[0].issuerId).toBe(initToken.profile.issuerId);
      expect(resolved.data.identities[0].subject).toBe(initToken.profile.subject);
      expect(resolved.data.access).toEqual(access);
    }, 180000);

    test('Resolving an init token with invalid protocol should fail', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
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
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = client.data;

      const resolved = await resolveInit(account, jwt, { protocol: 'pki' });
      expect(resolved).toBeHttpError(400, '"accessToken" is required');
    }, 180000);

    test('Resolving an init token with no publicKey returns an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = client.data;
      const initToken = decodeJwt(jwt, true);
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;
      const accessToken = await createPKIAccessToken(
        keyPair,
        keyId,
        initToken.profile.issuerId,
        initToken.profile.subject,
        account.baseUrl
      );

      const resolved = await resolveInit(account, jwt, { protocol: 'pki', accessToken });
      expect(resolved).toBeHttpError(400, '"publicKey" is required');
    }, 180000);

    test('Resolving an init token with no jwt returns an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = client.data;
      const initToken = decodeJwt(jwt, true);
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;
      const accessToken = await createPKIAccessToken(
        keyPair,
        keyId,
        initToken.profile.issuerId,
        initToken.profile.subject,
        account.baseUrl
      );

      const resolved = await resolveInit(account, undefined, {
        protocol: 'pki',
        publicKey: keyPair.publicKey,
        accessToken,
      });

      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with a non-existing account should return an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = client.data;
      const initToken = decodeJwt(jwt, true);
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;
      const accessToken = await createPKIAccessToken(
        keyPair,
        keyId,
        initToken.profile.issuerId,
        initToken.profile.subject,
        account.baseUrl
      );

      const resolved = await resolveInit(await getNonExistingAccount(), jwt, {
        protocol: 'pki',
        publicKey: keyPair.publicKey,
        accessToken,
      });

      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with non-jwt should return an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = client.data;
      const initToken = decodeJwt(jwt, true);
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;
      const accessToken = await createPKIAccessToken(
        keyPair,
        keyId,
        initToken.profile.issuerId,
        initToken.profile.subject,
        account.baseUrl
      );

      const resolved = await resolveInit(account, 'not a jwt', {
        protocol: 'pki',
        publicKey: keyPair.publicKey,
        accessToken,
      });

      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token using an access token with different issuerId should return an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = client.data;
      const initToken = decodeJwt(jwt, true);
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;
      const accessToken = await createPKIAccessToken(
        keyPair,
        keyId,
        'unrecognized issuer',
        initToken.profile.subject,
        account.baseUrl
      );

      const resolved = await resolveInit(account, jwt, {
        protocol: 'pki',
        publicKey: keyPair.publicKey,
        accessToken,
      });
      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token using an access token with different subject should return an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id, { protocol: 'pki', profile: {} });
      const jwt = client.data;
      const initToken = decodeJwt(jwt, true);
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;
      const accessToken = await createPKIAccessToken(
        keyPair,
        keyId,
        initToken.profile.issuerId,
        'unrecognized subject',
        account.baseUrl
      );

      const resolved = await resolveInit(account, jwt, {
        protocol: 'pki',
        publicKey: keyPair.publicKey,
        accessToken,
      });
      expect(resolved).toBeUnauthorizedError();
    }, 180000);
  });
});
