import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { addClient, getClient, removeClient, cleanUpClients } from './sdk';
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
  describe('Remove', () => {
    test('Getting a client should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        identities,
        access,
      });
      const client = await removeClient(account, original.data.id);
      expect(client.status).toBe(204);
      expect(client.data).toBeUndefined();

      const removed = await getClient(account, original.data.id);
      expect(removed.status).toBe(404);
    }, 20000);

    test('Removing a client with an invalid client id should return an error', async () => {
      const clientId = `clt-${random()}`;
      const client = await removeClient(account, clientId);
      expect(client.status).toBe(400);
      expect(client.data.status).toBe(400);
      expect(client.data.statusCode).toBe(400);
      expect(client.data.message).toBe(
        `"clientId" with value "${clientId}" fails to match the required pattern: /^clt-[a-g0-9]{16}$/`
      );
    }, 20000);

    test('Removing a non-existing client should return an error', async () => {
      const clientId = `clt-${random({ lengthInBytes: 8 })}`;
      const client = await removeClient(account, clientId);
      expect(client.status).toBe(404);
      expect(client.data.status).toBe(404);
      expect(client.data.statusCode).toBe(404);
      expect(client.data.message).toBe(`The client '${clientId}' does not exist`);
    }, 20000);

    test('Removing an client with a non-existing account should return an error', async () => {
      const original = await addClient(account, {});
      const client = await removeClient(invalidAccount, original.data.id);
      expect(client.status).toBe(404);
      expect(client.data.status).toBe(404);
      expect(client.data.statusCode).toBe(404);

      const message = client.data.message.replace(/'[^']*'/, '<issuer>');
      expect(message).toBe(`The issuer <issuer> is not associated with the account`);
    }, 10000);
  });
});
