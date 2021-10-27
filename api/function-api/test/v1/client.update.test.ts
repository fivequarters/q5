import { random } from '@5qtrs/random';

import { getMalformedAccount, getNonExistingAccount } from './accountResolver';
import { addClient, updateClient, cleanUpClients } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterEach(async () => {
  await cleanUpClients(account);
}, 180000);

describe('Client Update', () => {
  test('Updating a client with a display name and an existing display name should be supported', async () => {
    const original = await addClient(account, { displayName: 'display - test client' });
    const client = await updateClient(account, original.data.id, { displayName: 'updated - test client' });
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBe('updated - test client');
    expect(client.data.identities).toBeUndefined();
    expect(client.data.access).toBeUndefined();
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

  test('Updating a client with a display name and no existing display name should be supported', async () => {
    const original = await addClient(account, { displayName: 'display - test client' });
    const client = await updateClient(account, original.data.id, { displayName: 'updated - test client' });
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBe('updated - test client');
    expect(client.data.identities).toBeUndefined();
    expect(client.data.access).toBeUndefined();
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

  test('Updating a client with a display name should not alter other fields', async () => {
    const identities = [{ issuerId: 'test', subject: `sub-${random()}` }];
    const access = { allow: [{ action: 'client:*', resource: '/account/abc/' }] };
    const original = await addClient(account, {
      displayName: 'display',
      identities,
      access,
    });
    const client = await updateClient(account, original.data.id, { displayName: 'updated' });
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBe('updated');
    expect(client.data.identities).toEqual(identities);
    expect(client.data.access).toEqual(access);
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

  test('Updating a client with an identity and an existing identity should be supported', async () => {
    const original = await addClient(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
    const identities = [{ issuerId: 'foo', subject: `sub-${random()}` }];
    const client = await updateClient(account, original.data.id, { identities });
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBeUndefined();
    expect(client.data.identities).toEqual(identities);
    expect(client.data.access).toBeUndefined();
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

  test('Updating a client with an identity and no existing identity should be supported', async () => {
    const original = await addClient(account, {});
    const identities = [{ issuerId: 'foo', subject: `sub-${random()}` }];
    const client = await updateClient(account, original.data.id, { identities });
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBeUndefined();
    expect(client.data.identities).toEqual(identities);
    expect(client.data.access).toBeUndefined();
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

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
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBe('display');
    expect(client.data.identities).toEqual(identities);
    expect(client.data.access).toEqual(access);
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

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
  }, 180000);

  test('Updating a client with access should normalize resource ', async () => {
    const original = await addClient(account, { access: { allow: [{ action: '*', resource: '/account/abc' }] } });
    const access = { allow: [{ action: '*', resource: '/account/xyz' }] };
    const client = await updateClient(account, original.data.id, { access });

    access.allow[0].resource = `${access.allow[0].resource}/`;
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBeUndefined();
    expect(client.data.identities).toBeUndefined();
    expect(client.data.access).toEqual(access);
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

  test('Updating a client with access and existing access should be supported', async () => {
    const original = await addClient(account, { access: { allow: [{ action: '*', resource: '/account/abc' }] } });
    const access = { allow: [{ action: '*', resource: '/account/xyz/' }] };
    const client = await updateClient(account, original.data.id, { access });
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBeUndefined();
    expect(client.data.identities).toBeUndefined();
    expect(client.data.access).toEqual(access);
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

  test('Updating a client with access and no existing access should be supported', async () => {
    const original = await addClient(account, {});
    const access = { allow: [{ action: '*', resource: '/account/xyz/' }] };
    const client = await updateClient(account, original.data.id, { access });
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBeUndefined();
    expect(client.data.identities).toBeUndefined();
    expect(client.data.access).toEqual(access);
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

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
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBe('display');
    expect(client.data.identities).toEqual(identities);
    expect(client.data.access).toEqual(access);
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

  test('Updating a client with the id in the body should be supported', async () => {
    const original = await addClient(account, { displayName: 'displayName - test client' });
    const client = await updateClient(account, original.data.id, { id: original.data.id, displayName: 'updated' });
    expect(client).toBeHttp({ statusCode: 200 });
    expect(client.data.id).toBeDefined();
    expect(client.data.displayName).toBe('updated');
    expect(client.data.identities).toBeUndefined();
    expect(client.data.access).toBeUndefined();
    expect(client.data.id.indexOf('clt-')).toBe(0);
  }, 180000);

  test('Updating a client with an id in the body that does not match the url returns an error', async () => {
    const original = await addClient(account, { displayName: 'displayName - test client' });
    const id = 'clt-5555555555555555';
    const client = await updateClient(account, original.data.id, { id, displayName: 'updated' });
    expect(client).toBeHttpError(
      400,
      `The clientId in the body '${id}' does not match the clientId in the URL '${original.data.id}'`
    );
  }, 180000);

  test('Updating a client with an empty string display name is not supported', async () => {
    const original = await addClient(account, { displayName: 'displayName - test client' });
    const client = await updateClient(account, original.data.id, { displayName: '' });
    expect(client).toBeHttpError(400, '"displayName" is not allowed to be empty');
  }, 180000);

  test('Updating a client with an identity with an empty issuerId is not supported', async () => {
    const original = await addClient(account, {});
    const client = await updateClient(account, original.data.id, {
      identities: [{ issuerId: '', subject: `sub-${random()}` }],
    });
    expect(client).toBeHttpError(400, '"issuerId" is not allowed to be empty');
  }, 180000);

  test('Updating a client with an identity with a missing issuerId is not supported', async () => {
    const original = await addClient(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
    const client = await updateClient(account, original.data.id, { identities: [{ subject: `sub-${random()}` }] });
    expect(client).toBeHttpError(400, '"issuerId" is required');
  }, 180000);

  test('Updating a client with an identity with an empty subject is not supported', async () => {
    const original = await addClient(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
    const client = await updateClient(account, original.data.id, { identities: [{ issuerId: 'foo', subject: '' }] });
    expect(client).toBeHttpError(400, '"subject" is not allowed to be empty');
  }, 180000);

  test('Updating a client with an identity with a missing subject is not supported', async () => {
    const original = await addClient(account, {});
    const client = await updateClient(account, original.data.id, { identities: [{ issuerId: 'foo' }] });
    expect(client).toBeHttpError(400, '"subject" is required');
  }, 180000);

  test('Updating a client with access with an empty action is not supported', async () => {
    const original = await addClient(account, {});
    const client = await updateClient(account, original.data.id, {
      access: { allow: [{ action: '', resource: '/' }] },
    });
    expect(client).toBeHttpError(400, '"action" is not allowed to be empty');
  }, 180000);

  test('Updating a client with access with a missing action is not supported', async () => {
    const original = await addClient(account, { access: { allow: [{ action: '*', resource: '/' }] } });
    const client = await updateClient(account, original.data.id, { access: { allow: [{ resource: '/' }] } });
    expect(client).toBeHttpError(400, '"action" is required');
  }, 180000);

  test('Updating a client with access with an empty resource is not supported', async () => {
    const original = await addClient(account, { access: { allow: [{ action: '*', resource: '/' }] } });
    const client = await updateClient(account, original.data.id, {
      access: { allow: [{ action: '*', resource: '' }] },
    });
    expect(client).toBeHttpError(400, '"resource" is not allowed to be empty');
  }, 180000);

  test('Updating a client with access with a missing resource is not supported', async () => {
    const original = await addClient(account, {});
    const client = await updateClient(account, original.data.id, { access: { allow: [{ action: '*' }] } });
    expect(client).toBeHttpError(400, '"resource" is required');
  }, 180000);

  test('Updating a client with access with no allow is not supported', async () => {
    const original = await addClient(account, { access: { allow: [{ action: '*', resource: '/' }] } });
    const client = await updateClient(account, original.data.id, { access: {} });
    expect(client).toBeHttpError(400, '"allow" is required');
  }, 180000);

  test('Updating a client with access with an empty allow array is supported', async () => {
    const original = await addClient(account, {});
    const client = await updateClient(account, original.data.id, { access: { allow: [] } });
    expect(client).toBeHttp({ statusCode: 200, data: { id: client.data.id } });
  }, 180000);

  test('Updating a client with identities with an empty array is supported', async () => {
    const original = await addClient(account, { identities: [{ issuerId: 'foo', subject: `sub-${random()}` }] });
    const client = await updateClient(account, original.data.id, { identities: [] });
    expect(client).toBeHttp({ statusCode: 200, data: { id: client.data.id } });
  }, 180000);

  test('Updating a client with a malformed account should return an error', async () => {
    const original = await addClient(account, {});
    const malformed = await getMalformedAccount();
    const client = await updateClient(malformed, original.data.id, {});
    expect(client).toBeMalformedAccountError(malformed.accountId);
  }, 180000);

  test('Updating a client with a non-existing account should return an error', async () => {
    const original = await addClient(account, {});
    const client = await updateClient(await getNonExistingAccount(), original.data.id, {});
    expect(client).toBeUnauthorizedError();
  }, 180000);
});
