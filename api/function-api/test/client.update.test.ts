import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addClient, updateClient, cleanUpClients } from './sdk';
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
  describe('Update', () => {
    test('Updating a client with a display name and an existing display name should be supported', async () => {
      const original = await addClient(account, { displayName: 'display - test client' });
      const client = await updateClient(account, original.data.id, { displayName: 'updated - test client' });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBe('updated - test client');
      expect(client.data.identities).toBeUndefined();
      expect(client.data.access).toBeUndefined();
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 20000);

    test('Updating a client with a display name and no existing display name should be supported', async () => {
      const original = await addClient(account, { displayName: 'display - test client' });
      const client = await updateClient(account, original.data.id, { displayName: 'updated - test client' });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBe('updated - test client');
      expect(client.data.identities).toBeUndefined();
      expect(client.data.access).toBeUndefined();
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 20000);

    test('Updating a client with a display name should not alter other fields', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        identities,
        access,
      });
      const client = await updateClient(account, original.data.id, { displayName: 'updated' });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBe('updated');
      expect(client.data.identities).toEqual(identities);
      expect(client.data.access).toEqual(access);
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 20000);

    test('Updating a client with an identity and an existing identity should be supported', async () => {
      const original = await addClient(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
      const identities = [{ issuerId: 'foo', subject: `sub-${random()}` }];
      const client = await updateClient(account, original.data.id, { identities });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBeUndefined();
      expect(client.data.identities).toEqual(identities);
      expect(client.data.access).toBeUndefined();
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 20000);

    test('Updating a client with an identity and no existing identity should be supported', async () => {
      const original = await addClient(account, {});
      const identities = [{ issuerId: 'foo', subject: `sub-${random()}` }];
      const client = await updateClient(account, original.data.id, { identities });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBeUndefined();
      expect(client.data.identities).toEqual(identities);
      expect(client.data.access).toBeUndefined();
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 20000);

    test('Updating a client with an identity should not alter other fields', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        identities,
        access,
      });

      identities[0].subject = `sub-${random()}-updated`;
      const client = await updateClient(account, original.data.id, { identities });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBe('display');
      expect(client.data.identities).toEqual(identities);
      expect(client.data.access).toEqual(access);
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 20000);

    test('Updating a client with an existing identity should return an error', async () => {
      const subject = `sub-${random()}`;
      const identities = [{ issuerId: 'test', subject }];
      await addClient(account, { identities });
      const original = await addClient(account, {
        identities: [{ issuerId: 'test', subject: `sub-${random()}-other` }],
      });
      const client = await updateClient(account, original.data.id, { identities });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe(
        `The identity with issuer 'test' and subject '${subject}' is already associated with a user or client`
      );
    }, 20000);

    test('Updating a client with access should normalize resource ', async () => {
      const original = await addClient(account, { access: { allow: [{ action: '*', resource: '/account/abc' }] } });
      const access = { allow: [{ action: '*', resource: '/account/xyz' }] };
      const client = await updateClient(account, original.data.id, { access });

      access.allow[0].resource = `${access.allow[0].resource}/`;
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBeUndefined();
      expect(client.data.identities).toBeUndefined();
      expect(client.data.access).toEqual(access);
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 20000);

    test('Updating a client with access and existing access should be supported', async () => {
      const original = await addClient(account, { access: { allow: [{ action: '*', resource: '/account/abc' }] } });
      const access = { allow: [{ action: '*', resource: '/account/xyz/' }] };
      const client = await updateClient(account, original.data.id, { access });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBeUndefined();
      expect(client.data.identities).toBeUndefined();
      expect(client.data.access).toEqual(access);
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 20000);

    test('Updating a client with access and no existing access should be supported', async () => {
      const original = await addClient(account, {});
      const access = { allow: [{ action: '*', resource: '/account/xyz/' }] };
      const client = await updateClient(account, original.data.id, { access });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBeUndefined();
      expect(client.data.identities).toBeUndefined();
      expect(client.data.access).toEqual(access);
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 20000);

    test('Updating a client with an access should not alter other fields', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        identities,
        access,
      });

      access.allow[0].action = `client:*`;
      const client = await updateClient(account, original.data.id, { access });
      expect(client.status).toBe(200);
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBe('display');
      expect(client.data.identities).toEqual(identities);
      expect(client.data.access).toEqual(access);
      expect(client.data.id.indexOf('clt-')).toBe(0);
    }, 20000);

    test('Updating a client with an empty string display name is not supported', async () => {
      const original = await addClient(account, { displayName: 'displayName - test client' });
      const client = await updateClient(account, original.data.id, { displayName: '' });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"displayName" is not allowed to be empty');
    }, 20000);

    test('Updating a client with an identity with an empty issuerId is not supported', async () => {
      const original = await addClient(account, {});
      const client = await updateClient(account, original.data.id, {
        identities: [{ issuerId: '', subject: `sub-${random()}` }],
      });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"issuerId" is not allowed to be empty');
    }, 20000);

    test('Updating a client with an identity with a missing issuerId is not supported', async () => {
      const original = await addClient(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
      const client = await updateClient(account, original.data.id, { identities: [{ subject: `sub-${random()}` }] });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"issuerId" is required');
    }, 20000);

    test('Updating a client with an identity with an empty subject is not supported', async () => {
      const original = await addClient(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
      const client = await updateClient(account, original.data.id, { identities: [{ issuerId: 'foo', subject: '' }] });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"subject" is not allowed to be empty');
    }, 20000);

    test('Updating a client with an identity with a missing subject is not supported', async () => {
      const original = await addClient(account, {});
      const client = await updateClient(account, original.data.id, { identities: [{ issuerId: 'foo' }] });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"subject" is required');
    }, 20000);

    test('Updating a client with access with an empty action is not supported', async () => {
      const original = await addClient(account, {});
      const client = await updateClient(account, original.data.id, {
        access: { allow: [{ action: '', resource: '/' }] },
      });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"action" is not allowed to be empty');
    }, 20000);

    test('Updating a client with access with a missing action is not supported', async () => {
      const original = await addClient(account, { access: { allow: [{ action: '*', resource: '/' }] } });
      const client = await updateClient(account, original.data.id, { access: { allow: [{ resource: '/' }] } });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"action" is required');
    }, 20000);

    test('Updating a client with access with an empty resource is not supported', async () => {
      const original = await addClient(account, { access: { allow: [{ action: '*', resource: '/' }] } });
      const client = await updateClient(account, original.data.id, {
        access: { allow: [{ action: '*', resource: '' }] },
      });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"resource" is not allowed to be empty');
    }, 20000);

    test('Updating a client with access with a missing resource is not supported', async () => {
      const original = await addClient(account, {});
      const client = await updateClient(account, original.data.id, { access: { allow: [{ action: '*' }] } });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"resource" is required');
    }, 20000);

    test('Updating a client with access with no allow is not supported', async () => {
      const original = await addClient(account, { access: { allow: [{ action: '*', resource: '/' }] } });
      const client = await updateClient(account, original.data.id, { access: {} });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"allow" is required');
    }, 20000);

    test('Updating a client with access with an empty allow array is not supported', async () => {
      const original = await addClient(account, {});
      const client = await updateClient(account, original.data.id, { access: { allow: [] } });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"allow" must contain at least 1 items');
    }, 20000);

    test('Updating a client with identities with an empty array is not supported', async () => {
      const original = await addClient(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
      const client = await updateClient(account, original.data.id, { identities: [] });
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe('"identities" must contain at least 1 items');
    }, 20000);

    test('Updating a client with a non-existing account should return an error', async () => {
      const original = await addClient(account, {});
      const client = await updateClient(invalidAccount, original.data.id, {});
      expect(client.status).toBe(404);
      expect(client.data.status).toBe(404);
      expect(client.data.statusCode).toBe(404);

      const message = client.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 20000);
  });
});
