import { random } from '@5qtrs/random';

import { getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addClient, getClient, removeClient, cleanUpClients } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterEach(async () => {
  await cleanUpClients(account);
}, 180000);

describe('Client Remove', () => {
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
      expect(client).toBeHttp({ statusCode: 204 });
      expect(client.data).toBeUndefined();

      const removed = await getClient(account, original.data.id);
      expect(removed).toBeHttpError(404, `The client '${original.data.id}' does not exist`);
    }, 180000);

    test('Removing a client with an invalid client id should return an error', async () => {
      const clientId = `clt-${random()}`;
      const client = await removeClient(account, clientId);
      expect(client).toBeHttpError(
        400,
        `"clientId" with value "${clientId}" fails to match the required pattern: /^clt-[a-g0-9]{16}$/`
      );
    }, 180000);

    test('Removing a non-existing client should return an error', async () => {
      const clientId = `clt-${random({ lengthInBytes: 8 })}`;
      const client = await removeClient(account, clientId);
      expect(client).toBeHttpError(404, `The client '${clientId}' does not exist`);
    }, 180000);

    test('Removing a client with a malformed account should return an error', async () => {
      const original = await addClient(account, {});
      const malformed = await getMalformedAccount();
      const client = await removeClient(malformed, original.data.id);
      expect(client).toBeMalformedAccountError(malformed.accountId);
    }, 180000);

    test('Removing an client with a non-existing account should return an error', async () => {
      const original = await addClient(account, {});
      const client = await removeClient(await getNonExistingAccount(), original.data.id);
      expect(client).toBeUnauthorizedError();
    }, 180000);
  });
});
