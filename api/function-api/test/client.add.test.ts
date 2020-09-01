import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addClient, addUser, cleanUpClients } from './sdk';
import { random } from '@5qtrs/random';
import { extendExpect } from './extendJest';

const expectMore = extendExpect(expect);

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpClients(account);
}, 180000);

describe('Client', () => {
  describe('Add', () => {
    test('Adding a client should generate a client id', async () => {
      const client = await addClient(account, {});
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBeUndefined();
      expect(client.data.lastName).toBeUndefined();
      expect(client.data.primaryEmail).toBeUndefined();
      expect(client.data.identities).toBeUndefined();
      expect(client.data.access).toBeUndefined();
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 180000);

    test('Adding a client with a display name should be supported', async () => {
      const client = await addClient(account, { displayName: 'display - test client' });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBe('display - test client');
      expect(client.data.lastName).toBeUndefined();
      expect(client.data.primaryEmail).toBeUndefined();
      expect(client.data.identities).toBeUndefined();
      expect(client.data.access).toBeUndefined();
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 180000);

    test('Adding a client with an identity should be supported', async () => {
      const identities = [{ issuerId: 'foo', subject: `subj-${random()}` }];
      const client = await addClient(account, { identities });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBeUndefined();
      expect(client.data.lastName).toBeUndefined();
      expect(client.data.primaryEmail).toBeUndefined();
      expect(client.data.identities).toEqual(identities);
      expect(client.data.access).toBeUndefined();
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 180000);

    test('Adding a client with access should be supported', async () => {
      const access = { allow: [{ action: '*', resource: '/' }] };
      const client = await addClient(account, { access });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBeUndefined();
      expect(client.data.lastName).toBeUndefined();
      expect(client.data.primaryEmail).toBeUndefined();
      expect(client.data.identities).toBeUndefined();
      expect(client.data.access).toEqual(access);
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 180000);

    test('Adding a client with access should normalize the resource string', async () => {
      const access = { allow: [{ action: '*', resource: '/account/abc' }] };
      const client = await addClient(account, { access });

      access.allow[0].resource = `${access.allow[0].resource}/`;

      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBeUndefined();
      expect(client.data.lastName).toBeUndefined();
      expect(client.data.primaryEmail).toBeUndefined();
      expect(client.data.identities).toBeUndefined();
      expect(client.data.access).toEqual(access);
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 180000);

    test('Adding a client with an empty string display name is not supported', async () => {
      const client = await addClient(account, { displayName: '' });
      expectMore(client).toBeHttpError(400, '"displayName" is not allowed to be empty');
    }, 180000);

    test('Adding a client with an exisitng identity returns an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ issuerId: 'test', subject }];
      await addClient(account, { identities });
      const client = await addClient(account, { identities });
      expectMore(client).toBeHttpError(
        400,
        `The identity with issuer 'test' and subject '${subject}' is already associated with a user or client`
      );
    }, 180000);

    test('Adding a client with an id returns an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ id: 'clt-5555555555555555', issuerId: 'test', subject }];
      const client = await addClient(account, { identities });
      expectMore(client).toBeHttpError(400, '"id" is not allowed');
    }, 180000);

    test('Adding a client with an exisitng user identity returns an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ issuerId: 'test', subject }];
      await addUser(account, { identities });
      const client = await addClient(account, { identities });
      expectMore(client).toBeHttpError(
        400,
        `The identity with issuer 'test' and subject '${subject}' is already associated with a user or client`
      );
    }, 180000);

    test('Adding a client with an identity with an empty issuerId is not supported', async () => {
      const identities = [{ issuerId: '', subject: `sub-${random()}` }];
      const client = await addClient(account, { identities });
      expectMore(client).toBeHttpError(400, '"issuerId" is not allowed to be empty');
    }, 180000);

    test('Adding a client with an identity with a missing issuerId is not supported', async () => {
      const identities = [{ subject: `sub-${random()}` }];
      const client = await addClient(account, { identities });
      expectMore(client).toBeHttpError(400, '"issuerId" is required');
    }, 180000);

    test('Adding a client with an identity with an empty subject is not supported', async () => {
      const identities = [{ issuerId: 'foo', subject: '' }];
      const client = await addClient(account, { identities });
      expectMore(client).toBeHttpError(400, '"subject" is not allowed to be empty');
    }, 180000);

    test('Adding a client with an identity with a missing subject is not supported', async () => {
      const identities = [{ issuerId: 'foo' }];
      const client = await addClient(account, { identities });
      expectMore(client).toBeHttpError(400, '"subject" is required');
    }, 180000);

    test('Adding a client with access with an empty action is not supported', async () => {
      const access = { allow: [{ action: '', resource: '/' }] };
      const client = await addClient(account, { access });
      expectMore(client).toBeHttpError(400, '"action" is not allowed to be empty');
    }, 180000);

    test('Adding a client with access with a missing action is not supported', async () => {
      const access = { allow: [{ resource: '/' }] };
      const client = await addClient(account, { access });
      expectMore(client).toBeHttpError(400, '"action" is required');
    }, 180000);

    test('Adding a client with access with an empty resource is not supported', async () => {
      const access = { allow: [{ action: '*', resource: '' }] };
      const client = await addClient(account, { access });
      expectMore(client).toBeHttpError(400, '"resource" is not allowed to be empty');
    }, 180000);

    test('Adding a client with access with a missing resource is not supported', async () => {
      const access = { allow: [{ action: '*' }] };
      const client = await addClient(account, { access });
      expectMore(client).toBeHttpError(400, '"resource" is required');
    }, 180000);

    test('Adding a client with access with no allow is not supported', async () => {
      const access = {};
      const client = await addClient(account, { access });
      expectMore(client).toBeHttpError(400, '"allow" is required');
    }, 180000);

    test('Adding a client with access with an empty allow array is supported', async () => {
      const access = { allow: [] };
      const client = await addClient(account, { access });
      expect(client.status).toBe(200);
      expect(client.data).toEqual({ id: client.data.id });
    }, 180000);

    test('Adding a client with identities with an empty array is supported', async () => {
      const identities: any = [];
      const client = await addClient(account, { identities });
      expect(client.status).toBe(200);
      expect(client.data).toEqual({ id: client.data.id });
    }, 180000);

    test('Adding a client with a malformed account should return an error', async () => {
      const malformed = await getMalformedAccount();
      const client = await addClient(malformed, {});
      expectMore(client).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Adding a client with a non-existing account should return an error', async () => {
      const client = await addClient(await getNonExistingAccount(), {});
      expectMore(client).toBeUnauthorizedError();
    }, 180000);
  });
});
