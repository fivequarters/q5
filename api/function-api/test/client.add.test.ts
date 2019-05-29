import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addClient, addUser, cleanUpClients } from './sdk';
import { random } from '@5qtrs/random';

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
  await cleanUpClients(account);
}, 20000);

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
    }, 20000);

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
    }, 20000);

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
    }, 20000);

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
    }, 20000);

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
    }, 20000);

    test('Adding a client with an empty string display name is not supported', async () => {
      const client = await addClient(account, { displayName: '' });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"displayName" is not allowed to be empty');
    }, 20000);

    test('Adding a client with an exisitng identity returns an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ issuerId: 'test', subject }];
      await addClient(account, { identities });
      const client = await addClient(account, { identities });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe(
        `The identity with issuer 'test' and subject '${subject}' is already associated with a user or client`
      );
    }, 20000);

    test('Adding a client with an exisitng user identity returns an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ issuerId: 'test', subject }];
      await addUser(account, { identities });
      const client = await addClient(account, { identities });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe(
        `The identity with issuer 'test' and subject '${subject}' is already associated with a user or client`
      );
    }, 20000);

    test('Adding a client with an identity with an empty issuerId is not supported', async () => {
      const identities = [{ issuerId: '', subject: `sub-${random()}` }];
      const client = await addClient(account, { identities });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"issuerId" is not allowed to be empty');
    }, 20000);

    test('Adding a client with an identity with a missing issuerId is not supported', async () => {
      const identities = [{ subject: `sub-${random()}` }];
      const client = await addClient(account, { identities });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"issuerId" is required');
    }, 20000);

    test('Adding a client with an identity with an empty subject is not supported', async () => {
      const identities = [{ issuerId: 'foo', subject: '' }];
      const client = await addClient(account, { identities });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"subject" is not allowed to be empty');
    }, 20000);

    test('Adding a client with an identity with a missing subject is not supported', async () => {
      const identities = [{ issuerId: 'foo' }];
      const client = await addClient(account, { identities });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"subject" is required');
    }, 20000);

    test('Adding a client with access with an empty action is not supported', async () => {
      const access = { allow: [{ action: '', resource: '/' }] };
      const client = await addClient(account, { access });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"action" is not allowed to be empty');
    }, 20000);

    test('Adding a client with access with a missing action is not supported', async () => {
      const access = { allow: [{ resource: '/' }] };
      const client = await addClient(account, { access });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"action" is required');
    }, 20000);

    test('Adding a client with access with an empty resource is not supported', async () => {
      const access = { allow: [{ action: '*', resource: '' }] };
      const client = await addClient(account, { access });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"resource" is not allowed to be empty');
    }, 20000);

    test('Adding a client with access with a missing resource is not supported', async () => {
      const access = { allow: [{ action: '*' }] };
      const client = await addClient(account, { access });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"resource" is required');
    }, 20000);

    test('Adding a client with access with no allow is not supported', async () => {
      const access = {};
      const client = await addClient(account, { access });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"allow" is required');
    }, 20000);

    test('Adding a client with access with an empty allow array is not supported', async () => {
      const access = { allow: [] };
      const client = await addClient(account, { access });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"allow" must contain at least 1 items');
    }, 20000);

    test('Adding a client with identities with an empty array is not supported', async () => {
      const identities: any = [];
      const client = await addClient(account, { identities });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"identities" must contain at least 1 items');
    }, 20000);

    test('Adding a client with a non-existing account should return an error', async () => {
      const client = await addClient(invalidAccount, {});
      expect(client.status).toBe(404);
      expect(client.data.status).toBe(404);
      expect(client.data.statusCode).toBe(404);

      const message = client.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 20000);
  });
});
