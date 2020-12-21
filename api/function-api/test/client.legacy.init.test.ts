import { random } from '@5qtrs/random';
import { decodeJwt, decodeJwtHeader, signJwt } from '@5qtrs/jwt';
import { createKeyPair } from '@5qtrs/key-pair';

import { getNonExistingAccount } from './accountResolver';
import { addClient, initClient, resolveInit, cleanUpClients } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterEach(async () => {
  await cleanUpClients(account);
}, 180000);

describe('Legacy Client', () => {
  describe('Init', () => {
    test('Getting an init token should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        identities,
        access,
      });
      const client = await initClient(account, original.data.id);
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.accountId).toBe(account.accountId);
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.baseUrl).toBe(account.baseUrl);
      expect(decoded.iss).toBe(account.audience);
      expect(decoded.aud).toBe(account.audience);
      expect(decoded.issuerId).toBeDefined();
      expect(decoded.subject).toBeDefined();

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
      const client = await initClient(account, original.data.id, { subscriptionId: account.subscriptionId });
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

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
        subscriptionId: account.subscriptionId,
        boundaryId,
      });
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.accountId).toBe(account.accountId);
      expect(decoded.subscriptionId).toBe(account.subscriptionId);
      expect(decoded.boundaryId).toBe(boundaryId);
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.baseUrl).toBe(account.baseUrl);
      expect(decoded.issuerId).toBeDefined();
      expect(decoded.subject).toBeDefined();

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
        subscriptionId: account.subscriptionId,
        boundaryId,
        functionId: function1Id,
      });
      expect(client).toBeHttp({ statusCode: 200 });

      const jwt = client.data;

      const header = decodeJwtHeader(jwt);
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const decoded = decodeJwt(jwt, true);
      expect(decoded.accountId).toBe(account.accountId);
      expect(decoded.subscriptionId).toBe(account.subscriptionId);
      expect(decoded.boundaryId).toBe(boundaryId);
      expect(decoded.functionId).toBe(function1Id);
      expect(decoded.agentId).toBe(original.data.id);
      expect(decoded.baseUrl).toBe(account.baseUrl);
      expect(decoded.issuerId).toBeDefined();
      expect(decoded.subject).toBeDefined();

      const now = Math.floor(Date.now() / 1000);
      const eightHoursFromNow = now + 60 * 60 * 8;
      expect(decoded.iat).toBeGreaterThan(now - 10);
      expect(decoded.iat).toBeLessThan(now + 10);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 10);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 10);
    }, 180000);

    test('Getting an init token with an invalid client id should return an error', async () => {
      const clientId = `clt-${random()}`;
      const client = await initClient(account, clientId);
      expect(client).toBeHttpError(
        400,
        `"clientId" with value "${clientId}" fails to match the required pattern: /^clt-[a-g0-9]{16}$/`
      );
    }, 180000);

    test('Getting a non-existing client should return an error', async () => {
      const clientId = `clt-${random({ lengthInBytes: 8 })}`;
      const client = await initClient(account, clientId);
      expect(client).toBeHttpError(404, `The client '${clientId}' does not exist`);
    }, 180000);

    test('Getting an init token with a non-existing account should return an error', async () => {
      const original = await addClient(account, {});
      const client = await initClient(await getNonExistingAccount(), original.data.id);
      expect(client).toBeUnauthorizedError();
    }, 180000);
  });

  describe('Resolve', () => {
    test('Resolving an init token should be supported', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id);
      const jwt = client.data;
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved).toBeHttp({
        statusCode: 200,
        data: {
          id: original.data.id,
          displayName: 'display',
          access,
        },
      });
      expect(resolved.data.identities).toBeDefined();
      expect(resolved.data.identities.length).toBe(1);
      expect(resolved.data.identities[0].issuerId).toBeDefined();
      expect(resolved.data.identities[0].subject).toBeDefined();
      expect(resolved.data.access).toEqual(access);
    }, 180000);

    test('Resolving an init token with no publicKey returns an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id);
      const jwt = client.data;
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { keyId });
      expect(resolved).toBeHttpError(400, '"protocol" is required');
    }, 180000);

    test('Resolving an init token with no keyId returns an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id);
      const jwt = client.data;
      const keyPair = await createKeyPair();

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey });
      expect(resolved).toBeHttpError(400, '"protocol" is required');
    }, 180000);

    test('Resolving an init token with no jwt returns an error', async () => {
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, undefined, { publicKey: keyPair.publicKey, keyId });
      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with a non-existing account should return an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id);
      const jwt = client.data;
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(await getNonExistingAccount(), jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with non-jwt should return an error', async () => {
      const jwt = 'not a jwt';
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with a jwt missing an accountId should return an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const jwt = await signJwt({ agentId: original.data.id }, 'a secret');
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with a jwt missing an agentId should return an error', async () => {
      const jwt = await signJwt({ accountId: account.accountId }, 'a secret');
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved).toBeUnauthorizedError();
    }, 180000);

    test('Resolving an init token with a cloned and signed jwt returns an error', async () => {
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        access,
      });
      const client = await initClient(account, original.data.id);
      const decoded = decodeJwt(client.data, true);
      const jwt = await signJwt(decoded, 'a secret');
      const keyPair = await createKeyPair();
      const keyId = random({ lengthInBytes: 4 }) as string;

      const resolved = await resolveInit(account, jwt, { publicKey: keyPair.publicKey, keyId });
      expect(resolved).toBeUnauthorizedError();
    }, 180000);
  });
});
