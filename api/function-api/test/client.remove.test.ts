import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addClient, getClient, removeClient, cleanUpClients } from './sdk';
import { random } from '@5qtrs/random';
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
      expectMore(removed).toBeHttpError(404, `The client '${original.data.id}' does not exist`);
    }, 20000);

    test('Removing a client with an invalid client id should return an error', async () => {
      const clientId = `clt-${random()}`;
      const client = await removeClient(account, clientId);
      expectMore(client).toBeHttpError(
        400,
        `"clientId" with value "${clientId}" fails to match the required pattern: /^clt-[a-g0-9]{16}$/`
      );
    }, 20000);

    test('Removing a non-existing client should return an error', async () => {
      const clientId = `clt-${random({ lengthInBytes: 8 })}`;
      const client = await removeClient(account, clientId);
      expectMore(client).toBeHttpError(404, `The client '${clientId}' does not exist`);
    }, 20000);

    test('Removing a client with a malformed account should return an error', async () => {
      const original = await addClient(account, {});
      const malformed = await getMalformedAccount();
      const client = await removeClient(malformed, original.data.id);
      expectMore(client).toBeMalformedAccountError(malformed.accountId);
    }, 10000);

    test('Removing an client with a non-existing account should return an error', async () => {
      const original = await addClient(account, {});
      const client = await removeClient(await getNonExistingAccount(), original.data.id);
      expectMore(client).toBeUnauthorizedError();
    }, 10000);
  });
});
