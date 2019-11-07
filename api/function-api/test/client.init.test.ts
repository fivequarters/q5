import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addClient, initClient, resolveInit, cleanUpClients } from './sdk';
import { random } from '@5qtrs/random';
import { decodeJwt, decodeJwtHeader, signJwt } from '@5qtrs/jwt';
import { createKeyPair } from '@5qtrs/key-pair';
import { extendExpect } from './extendJest';

const expectMore = extendExpect(expect);

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpClients(account);
}, 20000);

describe('Client', () => {
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
      expect(client.status).toBe(200);

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
    }, 20000);

    test('Getting an init token with a subscriptionId set should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        identities,
        access,
      });
      const client = await initClient(account, original.data.id, { subscriptionId: account.subscriptionId });
      expect(client.status).toBe(200);

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
    }, 20000);

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
        boundaryId: 'boundary-abc',
      });
      expect(client.status).toBe(200);

      const jwt = client.data;

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
      expect(decoded.iat).toBeGreaterThan(now - 10);
      expect(decoded.iat).toBeLessThan(now + 10);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 10);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 10);
    }, 20000);

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
        boundaryId: 'boundary-abc',
        functionId: 'function-abc',
      });
      expect(client.status).toBe(200);

      const jwt = client.data;

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
      expect(decoded.iat).toBeGreaterThan(now - 10);
      expect(decoded.iat).toBeLessThan(now + 10);
      expect(decoded.exp).toBeGreaterThan(eightHoursFromNow - 10);
      expect(decoded.exp).toBeLessThan(eightHoursFromNow + 10);
    }, 20000);

    test('Getting an init token with an invalid client id should return an error', async () => {
      const clientId = `clt-${random()}`;
      const client = await initClient(account, clientId);
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe(
        `"clientId" with value "${clientId}" fails to match the required pattern: /^clt-[a-g0-9]{16}$/`
      );
    }, 20000);

    test('Getting a non-existing client should return an error', async () => {
      const clientId = `clt-${random({ lengthInBytes: 8 })}`;
      const client = await initClient(account, clientId);
      expect(client.status).toBe(404);
      expect(client.data.status).toBe(404);
      expect(client.data.statusCode).toBe(404);
      expect(client.data.message).toBe(`The client '${clientId}' does not exist`);
    }, 20000);

    test('Getting an init token with a non-existing account should return an error', async () => {
      const original = await addClient(account, {});
      const client = await initClient(await getNonExistingAccount(), original.data.id);
      expectMore(client).toBeUnauthorizedError();
    }, 10000);
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
      expect(resolved.status).toBe(200);
      expect(resolved.data.id).toBe(original.data.id);
      expect(resolved.data.displayName).toBe('display');
      expect(resolved.data.identities).toBeDefined();
      expect(resolved.data.identities.length).toBe(1);
      expect(resolved.data.identities[0].issuerId).toBeDefined();
      expect(resolved.data.identities[0].subject).toBeDefined();
      expect(resolved.data.access).toEqual(access);
    }, 20000);

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
      expect(resolved.status).toBe(400);
      expect(resolved.data.status).toBe(400);
      expect(resolved.data.statusCode).toBe(400);
      expect(resolved.data.message).toBe('"publicKey" is required');
    }, 20000);

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
      expectMore(resolved).toBeUnauthorizedError();
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
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
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
      expect(resolved.status).toBe(403);
      expect(resolved.data.status).toBe(403);
      expect(resolved.data.statusCode).toBe(403);
      expect(resolved.data.message).toBe('Unauthorized');
    }, 10000);
  });
});
