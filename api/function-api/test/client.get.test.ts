import { IAccount, FakeAccount, resolveAccount, getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addClient, getClient, cleanUpClients } from './sdk';
import { random } from '@5qtrs/random';
import './extendJest';

let account: IAccount = FakeAccount;

beforeAll(async () => {
  account = await resolveAccount();
});

afterEach(async () => {
  await cleanUpClients(account);
}, 180000);

describe('Client', () => {
  describe('Get', () => {
    test('Getting a client should be supported', async () => {
      const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
      const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
      const original = await addClient(account, {
        displayName: 'display',
        identities,
        access,
      });
      const client = await getClient(account, original.data.id);
      expect(client).toBeHttp({ statusCode: 200 });
      expect(client.data.id).toBeDefined();
      expect(client.data.displayName).toBe('display');
      expect(client.data.identities).toEqual(identities);
      expect(client.data.access).toEqual(access);
      expect(client.data.id).toBe(original.data.id);
    }, 180000);

    test('Getting a client with an invalid client id should return an error', async () => {
      const clientId = `clt-${random()}`;
      const client = await getClient(account, clientId);
      expect(client).toBeHttpError(
        400,
        `"clientId" with value "${clientId}" fails to match the required pattern: /^clt-[a-g0-9]{16}$/`
      );
    }, 180000);

    test('Getting a non-existing client should return an error', async () => {
      const clientId = `clt-${random({ lengthInBytes: 8 })}`;
      const client = await getClient(account, clientId);
      expect(client).toBeHttpError(404, `The client '${clientId}' does not exist`);
    }, 180000);

    test('Getting an client with a malformed account should return an error', async () => {
      const original = await addClient(account, {});
      const malformed = await getMalformedAccount();
      const client = await getClient(malformed, original.data.id);
      expect(client).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Getting an client with a non-existing account should return an error', async () => {
      const original = await addClient(account, {});
      const client = await getClient(await getNonExistingAccount(), original.data.id);
      expect(client).toBeUnauthorizedError();
    }, 180000);
  });
});
