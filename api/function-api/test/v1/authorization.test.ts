import { random } from '@5qtrs/random';

import { cloneWithAccessToken } from './accountResolver';
import {
  putFunction,
  getFunction,
  getFunctionLocation,
  getLogs,
  deleteFunction,
  listFunctions,
  addUser,
  listUsers,
  updateUser,
  removeUser,
  getUser,
  initUser,
  addClient,
  listClients,
  updateClient,
  removeClient,
  getClient,
  initClient,
  addIssuer,
  listIssuers,
  getIssuer,
  updateIssuer,
  removeIssuer,
  listAudit,
  getStorage,
  setStorage,
  listStorage,
  removeStorage,
  cleanUpUsers,
  cleanUpClients,
  cleanUpStorage,
  createTestJwksIssuer,
  cleanUpHostedIssuers,
} from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const helloFunction = {
  nodejs: {
    files: {
      'index.js': `module.exports = (ctx, cb) => cb(null, { body: 'hello' });`,
    },
  },
};

let testIssuer = {
  issuerId: 'none',
  keys: [{ privateKey: 'none', publicKey: ' none', keyId: 'none' }],
  getAccessToken: async (subject: string) => 'none',
};

beforeAll(async () => {
  ({ account } = getEnv());
  testIssuer = await createTestJwksIssuer(account);
}, 180000);

afterAll(async () => {
  await cleanUpHostedIssuers(account);
  await cleanUpUsers(account);
  await cleanUpClients(account);
  await cleanUpStorage(account);
}, 200000);

describe('Authorization', () => {
  test('A user without access should not be authorized to do anything', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A client without access should not be authorized to do anything', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    await addClient(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const clientAccount = cloneWithAccessToken(account, jwt);

    const results = await Promise.all([
      putFunction(clientAccount, boundaryId, function1Id, {}),
      getFunction(clientAccount, boundaryId, function1Id),
      getLogs(clientAccount, boundaryId, undefined, true),
      getLogs(clientAccount, boundaryId, function1Id, true),
      getFunctionLocation(clientAccount, boundaryId, function1Id),
      deleteFunction(clientAccount, boundaryId, function1Id),
      listFunctions(clientAccount),
      addIssuer(clientAccount, 'test-issuer', {}),
      listIssuers(clientAccount),
      getIssuer(clientAccount, testIssuer.issuerId),
      updateIssuer(clientAccount, 'test-issuer', {}),
      removeIssuer(clientAccount, 'test-issuer'),
      addUser(clientAccount, {}),
      getUser(clientAccount, 'usr-1234567890123456'),
      listUsers(clientAccount, {}),
      updateUser(clientAccount, 'usr-1234567890123456', {}),
      removeUser(clientAccount, 'usr-1234567890123456'),
      initUser(clientAccount, 'usr-1234567890123456'),
      addClient(clientAccount, {}),
      getClient(clientAccount, 'clt-1234567890123456'),
      listClients(clientAccount, {}),
      updateClient(clientAccount, 'clt-1234567890123456', {}),
      removeClient(clientAccount, 'clt-1234567890123456'),
      initClient(clientAccount, 'clt-1234567890123456'),
      listAudit(clientAccount),
      getStorage(clientAccount, 'some-id'),
      setStorage(clientAccount, 'some-id', { data: 'hello' }),
      removeStorage(clientAccount, 'some-id'),
      listStorage(clientAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to get a function should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const action = 'function:get';
    const resource = [
      `/account/${account.accountId}/subscription/${account.subscriptionId}`,
      `/boundary/${boundaryId}/function/${functionId}`,
    ].join('');

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedResult = await getFunction(userAccount, boundaryId, functionId);
    expect(allowedResult).toBeNotFoundError();

    const allowedLocation = await getFunctionLocation(userAccount, boundaryId, functionId);
    expect(allowedLocation).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, functionId, {}),
      getFunction(userAccount, boundaryId, 'another-function'),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, functionId, true),
      getFunctionLocation(userAccount, boundaryId, 'another-function'),
      deleteFunction(userAccount, boundaryId, functionId),
      listFunctions(userAccount),
      listFunctions(userAccount, boundaryId),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to get functions of a boundary should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'function:get';
    const resource = [
      `/account/${account.accountId}/subscription/${account.subscriptionId}`,
      `/boundary/${boundaryId}`,
    ].join('');

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const allowedResult = await getFunction(userAccount, boundaryId, functionId);
    expect(allowedResult).toBeNotFoundError();

    const allowedResult2 = await getFunction(userAccount, boundaryId, `test-function-${random({ lengthInBytes: 8 })}`);
    expect(allowedResult2).toBeNotFoundError();

    const allowedToList = await listFunctions(userAccount, boundaryId);
    expect(allowedToList).toBeHttp({ statusCode: 200 });

    const allowedLocation = await getFunctionLocation(userAccount, boundaryId, functionId);
    expect(allowedLocation).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, functionId, {}),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, functionId, true),
      deleteFunction(userAccount, boundaryId, functionId),
      listFunctions(userAccount),
      listFunctions(userAccount, 'another-boundary'),
      getFunctionLocation(userAccount, 'another-boundary', functionId),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to get functions of a subscription should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'function:get';
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}`;

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const allowedResult = await getFunction(userAccount, boundaryId, functionId);
    expect(allowedResult).toBeNotFoundError();

    const allowedResult2 = await getFunction(
      userAccount,
      `test-boundary-${random({ lengthInBytes: 8 })}`,
      `test-function-${random({ lengthInBytes: 8 })}`
    );
    expect(allowedResult2).toBeNotFoundError();

    const allowedToList = await listFunctions(userAccount);
    expect(allowedToList).toBeHttp({ statusCode: 200 });

    const allowedLocation = await getFunctionLocation(userAccount, boundaryId, functionId);
    expect(allowedLocation).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, functionId, {}),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, functionId, true),
      deleteFunction(userAccount, boundaryId, functionId),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to put a function should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const action = 'function:put';
    const resource = [
      `/account/${account.accountId}/subscription/${account.subscriptionId}`,
      `/boundary/${boundaryId}/function/${functionId}`,
    ].join('');

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedResult = await putFunction(userAccount, boundaryId, functionId, helloFunction);
    expect(allowedResult).toBeHttp({ statusCode: 200 });
    await deleteFunction(account, boundaryId, functionId);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, 'another-function', {}),
      getFunction(userAccount, boundaryId, functionId),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, functionId, true),
      getFunctionLocation(userAccount, boundaryId, functionId),
      deleteFunction(userAccount, boundaryId, functionId),
      listFunctions(userAccount),
      listFunctions(userAccount, boundaryId),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to put functions of a boundary should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'function:put';
    const resource = [
      `/account/${account.accountId}/subscription/${account.subscriptionId}`,
      `/boundary/${boundaryId}`,
    ].join('');

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const allowedResult = await putFunction(userAccount, boundaryId, functionId, helloFunction);
    expect(allowedResult).toBeHttp({ statusCode: 200 });
    await deleteFunction(account, boundaryId, functionId);

    const results = await Promise.all([
      putFunction(userAccount, 'another-boundary', functionId, {}),
      getFunction(userAccount, boundaryId, functionId),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, functionId, true),
      getFunctionLocation(userAccount, boundaryId, functionId),
      deleteFunction(userAccount, boundaryId, functionId),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      listFunctions(userAccount, boundaryId),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to put functions of a subscription should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'function:put';
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}`;

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    let boundaryId = `test-boundary-${random({ lengthInBytes: 8 })}`;
    let functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const allowedResult = await putFunction(userAccount, boundaryId, functionId, helloFunction);
    expect(allowedResult).toBeHttp({ statusCode: 200 });
    await deleteFunction(account, boundaryId, functionId);

    boundaryId = `test-boundary-${random({ lengthInBytes: 8 })}`;
    functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const allowedResult2 = await putFunction(userAccount, boundaryId, functionId, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => cb(null, { body: 'hello' });`,
        },
      },
    });
    expect(allowedResult2.status).toBe(200);
    await deleteFunction(account, boundaryId, functionId);

    const results = await Promise.all([
      getFunction(userAccount, boundaryId, functionId),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, functionId, true),
      getFunctionLocation(userAccount, boundaryId, functionId),
      deleteFunction(userAccount, boundaryId, functionId),
      listFunctions(userAccount),
      listFunctions(userAccount, boundaryId),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to remove a function should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const action = 'function:delete';
    const resource = [
      `/account/${account.accountId}/subscription/${account.subscriptionId}`,
      `/boundary/${boundaryId}/function/${functionId}`,
    ].join('');

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedResult = await deleteFunction(userAccount, boundaryId, functionId);
    expect(allowedResult).toBeNotFoundError();

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, functionId, {}),
      getFunction(userAccount, boundaryId, functionId),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, functionId, true),
      getFunctionLocation(userAccount, boundaryId, functionId),
      listFunctions(userAccount),
      listFunctions(userAccount, boundaryId),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to remove functions of a boundary should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'function:delete';
    const resource = [
      `/account/${account.accountId}/subscription/${account.subscriptionId}`,
      `/boundary/${boundaryId}`,
    ].join('');

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const allowedResult = await deleteFunction(userAccount, boundaryId, functionId);
    expect(allowedResult).toBeNotFoundError();

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, functionId, {}),
      getFunction(userAccount, boundaryId, functionId),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, functionId, true),
      getFunctionLocation(userAccount, boundaryId, functionId),
      deleteFunction(userAccount, 'another-boundary', functionId),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      listFunctions(userAccount, boundaryId),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to remove functions of a subscription should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'function:delete';
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}`;

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const allowedResult = await deleteFunction(userAccount, boundaryId, functionId);
    expect(allowedResult).toBeNotFoundError();

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, functionId, {}),
      getFunction(userAccount, boundaryId, functionId),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, functionId, true),
      getFunctionLocation(userAccount, boundaryId, functionId),
      listFunctions(userAccount),
      listFunctions(userAccount, boundaryId),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to get logs of a function should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const action = 'function:get-log';
    const resource = [
      `/account/${account.accountId}/subscription/${account.subscriptionId}`,
      `/boundary/${boundaryId}/function/${functionId}`,
    ].join('');

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedResult = await getLogs(userAccount, boundaryId, functionId, true);
    expect(allowedResult).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, functionId, {}),
      getFunction(userAccount, boundaryId, functionId),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, 'another-function', true),
      deleteFunction(userAccount, boundaryId, functionId),
      getFunctionLocation(userAccount, boundaryId, functionId),
      listFunctions(userAccount),
      listFunctions(userAccount, boundaryId),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to get logs of functions of a boundary should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'function:get-log';
    const resource = [
      `/account/${account.accountId}/subscription/${account.subscriptionId}`,
      `/boundary/${boundaryId}`,
    ].join('');

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;

    const allowedResult = await getLogs(userAccount, boundaryId, functionId, true);
    expect(allowedResult).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, functionId, {}),
      getFunction(userAccount, boundaryId, functionId),
      getLogs(userAccount, 'another-boundary'),
      getLogs(userAccount, 'another-boundary', functionId),
      deleteFunction(userAccount, boundaryId, functionId),
      getFunctionLocation(userAccount, boundaryId, functionId),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      listFunctions(userAccount, boundaryId),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to get logs of functions of a subscription should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'function:get-log';
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}`;

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const allowedLogs = await getLogs(userAccount, boundaryId, functionId, true);
    expect(allowedLogs).toBeHttp({ statusCode: 200 });

    const allowedLogs2 = await getLogs(userAccount, boundaryId, undefined, true);
    expect(allowedLogs2.status).toBe(200);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, functionId, {}),
      getFunction(userAccount, boundaryId, functionId),
      deleteFunction(userAccount, boundaryId, functionId),
      getFunctionLocation(userAccount, boundaryId, functionId),
      listFunctions(userAccount),
      listFunctions(userAccount, boundaryId),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to a function should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
    const action = 'function:*';
    const resource = [
      `/account/${account.accountId}/subscription/${account.subscriptionId}`,
      `/boundary/${boundaryId}/function/${functionId}`,
    ].join('');

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedPut = await putFunction(userAccount, boundaryId, functionId, helloFunction);
    expect(allowedPut).toBeHttp({ statusCode: 200 });

    const allowedGet = await getFunction(userAccount, boundaryId, functionId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedLocation = await getFunctionLocation(userAccount, boundaryId, functionId);
    expect(allowedLocation).toBeHttp({ statusCode: 200 });

    const allowedLogs = await getLogs(userAccount, boundaryId, functionId, true);
    expect(allowedLogs).toBeHttp({ statusCode: 200 });

    const allowedDelete = await deleteFunction(userAccount, boundaryId, functionId);
    expect(allowedDelete).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, 'another-function', {}),
      getFunction(userAccount, boundaryId, 'another-function'),
      getLogs(userAccount, boundaryId, 'another-function', true),
      deleteFunction(userAccount, boundaryId, 'another-function'),
      getFunctionLocation(userAccount, boundaryId, 'another-function'),
      listFunctions(userAccount),
      listFunctions(userAccount, boundaryId),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to functions of a boundary should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'function:*';
    const resource = [
      `/account/${account.accountId}/subscription/${account.subscriptionId}`,
      `/boundary/${boundaryId}`,
    ].join('');

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;

    const allowedPut = await putFunction(userAccount, boundaryId, functionId, helloFunction);
    expect(allowedPut).toBeHttp({ statusCode: 200 });

    const allowedGet = await getFunction(userAccount, boundaryId, functionId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedLocation = await getFunctionLocation(userAccount, boundaryId, functionId);
    expect(allowedLocation).toBeHttp({ statusCode: 200 });

    const allowedLogs = await getLogs(userAccount, boundaryId, functionId, true);
    expect(allowedLogs).toBeHttp({ statusCode: 200 });

    const allowedDelete = await deleteFunction(userAccount, boundaryId, functionId);
    expect(allowedDelete).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, 'another-boundary', functionId, {}),
      getFunction(userAccount, 'another-boundary', functionId),
      getLogs(userAccount, 'another-boundary', undefined, true),
      getLogs(userAccount, 'another-boundary', functionId, true),
      deleteFunction(userAccount, 'another-boundary', functionId),
      getFunctionLocation(userAccount, 'another-boundary', functionId),
      listFunctions(userAccount, 'another-boundary'),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to functions of a subscription should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'function:*';
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}`;

    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const functionId = `test-function-${random({ lengthInBytes: 8 })}`;

    const allowedPut = await putFunction(userAccount, boundaryId, functionId, helloFunction);
    expect(allowedPut).toBeHttp({ statusCode: 200 });

    const allowedGet = await getFunction(userAccount, boundaryId, functionId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedLocation = await getFunctionLocation(userAccount, boundaryId, functionId);
    expect(allowedLocation).toBeHttp({ statusCode: 200 });

    const allowedLogs = await getLogs(userAccount, boundaryId, functionId, true);
    expect(allowedLogs).toBeHttp({ statusCode: 200 });

    const allowedDelete = await deleteFunction(userAccount, boundaryId, functionId);
    expect(allowedDelete).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      addIssuer(userAccount, 'some-issuer', {}),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to add an issuer should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
    const action = 'issuer:add';
    const resource = `/account/${account.accountId}/issuer/${issuerId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedAdd = await addIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' });
    expect(allowedAdd).toBeHttp({ statusCode: 200 });
    await removeIssuer(account, issuerId);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, issuerId),
      updateIssuer(userAccount, issuerId, {}),
      removeIssuer(userAccount, issuerId),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to add any issuer should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
    const action = 'issuer:add';
    const resource = `/account/${account.accountId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedAdd = await addIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' });
    expect(allowedAdd).toBeHttp({ statusCode: 200 });
    await removeIssuer(account, issuerId);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      getIssuer(userAccount, issuerId),
      updateIssuer(userAccount, issuerId, {}),
      removeIssuer(userAccount, issuerId),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to get an issuer should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
    const action = 'issuer:get';
    const resource = `/account/${account.accountId}/issuer/${issuerId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedGet = await getIssuer(userAccount, issuerId);
    expect(allowedGet.status).toBe(404);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'test-issuer'),
      updateIssuer(userAccount, issuerId, {}),
      removeIssuer(userAccount, issuerId),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to get any issuer should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
    const action = 'issuer:get';
    const resource = `/account/${account.accountId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedGet = await getIssuer(userAccount, issuerId);
    expect(allowedGet.status).toBe(404);

    const allowedGet2 = await getIssuer(userAccount, testIssuer.issuerId);
    expect(allowedGet2.status).toBe(200);

    const allowedlist = await listIssuers(userAccount);
    expect(allowedlist).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, issuerId, {}),
      updateIssuer(userAccount, issuerId, {}),
      removeIssuer(userAccount, issuerId),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to update an issuer should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
    const action = 'issuer:update';
    const resource = `/account/${account.accountId}/issuer/${issuerId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedUpdate = await updateIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key ' });
    expect(allowedUpdate.status).toBe(404);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, issuerId),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to update any issuer should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
    const action = 'issuer:update';
    const resource = `/account/${account.accountId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedUpdate = await updateIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' });
    expect(allowedUpdate.status).toBe(404);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      getIssuer(userAccount, issuerId),
      addIssuer(userAccount, issuerId, {}),
      removeIssuer(userAccount, issuerId),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to remove an issuer should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
    const action = 'issuer:delete';
    const resource = `/account/${account.accountId}/issuer/${issuerId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedRemove = await removeIssuer(userAccount, issuerId);
    expect(allowedRemove.status).toBe(404);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' }),
      updateIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, issuerId),
      updateIssuer(userAccount, issuerId, {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to remove any issuer should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
    const action = 'issuer:delete';
    const resource = `/account/${account.accountId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedRemove = await removeIssuer(userAccount, issuerId);
    expect(allowedRemove.status).toBe(404);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      getIssuer(userAccount, issuerId),
      addIssuer(userAccount, issuerId, {}),
      updateIssuer(userAccount, issuerId, {}),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to an issuer should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
    const action = 'issuer:*';
    const resource = `/account/${account.accountId}/issuer/${issuerId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedAdd = await addIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' });
    expect(allowedAdd).toBeHttp({ statusCode: 200 });

    const allowedGet = await getIssuer(userAccount, issuerId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedUpdate = await updateIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-other-key' });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const allowedRemove = await removeIssuer(userAccount, issuerId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      updateIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'test-issuer'),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to any issuer should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
    const action = 'issuer:*';
    const resource = `/account/${account.accountId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedAdd = await addIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' });
    expect(allowedAdd).toBeHttp({ statusCode: 200 });

    const allowedGet = await getIssuer(userAccount, issuerId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedUpdate = await updateIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-other-key' });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const allowedlist = await listIssuers(userAccount);
    expect(allowedlist).toBeHttp({ statusCode: 200 });

    const allowedRemove = await removeIssuer(userAccount, issuerId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to add any user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'user:add';
    const resource = `/account/${account.accountId}/user`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedAdd = await addUser(userAccount, {});
    expect(allowedAdd).toBeHttp({ statusCode: 200 });
    const userId = allowedAdd.data.id;

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      getUser(userAccount, userId),
      listUsers(userAccount, {}),
      updateUser(userAccount, userId, {}),
      removeUser(userAccount, userId),
      initUser(userAccount, userId),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to add any user should not be able to give that user any additional access', async () => {
    const { account, boundaryId, function1Id } = getEnv();
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const userAction = 'user:add';
    const userResource = `/account/${account.accountId}/user`;

    const additionalAccess = {
      action: 'function:get',
      resource: [
        `/account/${account.accountId}/subscription/${account.subscriptionId}`,
        `/boundary/${boundaryId}/function/${function1Id}`,
      ].join(''),
    };

    const user = await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: userAction, resource: userResource }, additionalAccess] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);
    const userId = user.data.id;

    const allowedAdd = await addUser(userAccount, { access: { allow: [additionalAccess] } });
    expect(allowedAdd).toBeHttp({ statusCode: 200 });

    const allowStatements = [
      {
        action: 'function:get',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function`,
      },
      {
        action: 'function:get',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/another-function`,
      },
      {
        action: 'function:put',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${function1Id}`,
      },
    ];

    const results = await Promise.all(
      allowStatements.map((allow) => addUser(userAccount, { access: { allow: [allow] } }))
    );

    results.forEach((result: any, index: number) => {
      const { action, resource } = allowStatements[index];
      expect(result).toBeUnauthorizedToGrantError(userId, action, resource);
    });
  }, 180000);

  test('A user with access to get a user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const user = await addUser(account, {});
    expect(user).toBeHttp({ statusCode: 200 });
    const userId = user.data.id;

    const action = 'user:get';
    const resource = `/account/${account.accountId}/user/${userId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedGet = await getUser(userAccount, userId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, userId, {}),
      removeUser(userAccount, userId),
      initUser(userAccount, userId),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to get any user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const user = await addUser(account, {});
    expect(user).toBeHttp({ statusCode: 200 });
    const userId = user.data.id;

    const action = 'user:get';
    const resource = `/account/${account.accountId}/user`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedGet = await getUser(userAccount, userId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedGet2 = await getUser(userAccount, 'usr-1234567890123456');
    expect(allowedGet2.status).toBe(404);

    const allowedList = await listUsers(userAccount, {});
    expect(allowedList).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      updateUser(userAccount, userId, {}),
      removeUser(userAccount, userId),
      initUser(userAccount, userId),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to update a user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const user = await addUser(account, {});
    expect(user).toBeHttp({ statusCode: 200 });
    const userId = user.data.id;

    const action = 'user:update';
    const resource = `/account/${account.accountId}/user/${userId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedUpdate = await updateUser(userAccount, userId, { firstName: 'test user' });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, userId),
      listUsers(userAccount),
      removeUser(userAccount, userId),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      initUser(userAccount, userId),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to update any user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const user = await addUser(account, {});
    expect(user).toBeHttp({ statusCode: 200 });
    const userId = user.data.id;

    const action = 'user:update';
    const resource = `/account/${account.accountId}/user`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedUpdate = await updateUser(userAccount, userId, { firstName: 'test user' });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, userId),
      listUsers(userAccount),
      removeUser(userAccount, userId),
      initUser(userAccount, userId),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to update any user should not be able to give that user any additional access', async () => {
    const { account, boundaryId, function1Id } = getEnv();
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const userAction = 'user:update';
    const userResource = `/account/${account.accountId}/user`;

    const additionalAccess = {
      action: 'function:get',
      resource: [
        `/account/${account.accountId}/subscription/${account.subscriptionId}`,
        `/boundary/${boundaryId}/function/${function1Id}`,
      ].join(''),
    };

    const user = await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: userAction, resource: userResource }, additionalAccess] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);
    const userId = user.data.id;

    const newUser = await addUser(account, {});
    const newUserId = newUser.data.id;

    const allowedUpdate = await updateUser(userAccount, newUserId, { access: { allow: [additionalAccess] } });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const allowStatements = [
      {
        action: 'function:get',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function`,
      },
      {
        action: 'function:get',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/another-function`,
      },
      {
        action: 'function:put',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${function1Id}`,
      },
    ];

    const results = await Promise.all(
      allowStatements.map((allow) => updateUser(userAccount, newUserId, { access: { allow: [allow] } }))
    );

    results.forEach((result: any, index: number) => {
      const { action, resource } = allowStatements[index];
      expect(result).toBeUnauthorizedToGrantError(userId, action, resource);
    });
  }, 180000);

  test('A user with access to remove a user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const user = await addUser(account, {});
    expect(user).toBeHttp({ statusCode: 200 });
    const userId = user.data.id;

    const action = 'user:delete';
    const resource = `/account/${account.accountId}/user/${userId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedRemove = await removeUser(userAccount, userId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, userId),
      updateUser(userAccount, userId, {}),
      listUsers(userAccount),
      removeUser(userAccount, 'usr-1234567890123456'),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      initUser(userAccount, userId),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to remove any user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const user = await addUser(account, {});
    expect(user).toBeHttp({ statusCode: 200 });
    const userId = user.data.id;

    const action = 'user:delete';
    const resource = `/account/${account.accountId}/user`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedRemove = await removeUser(userAccount, userId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, userId),
      updateUser(userAccount, userId, {}),
      listUsers(userAccount),
      initUser(userAccount, userId),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to init a user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const user = await addUser(account, {});
    expect(user).toBeHttp({ statusCode: 200 });
    const userId = user.data.id;

    const action = 'user:init';
    const resource = `/account/${account.accountId}/user/${userId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedInit = await initUser(userAccount, userId);
    expect(allowedInit).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, userId),
      updateUser(userAccount, userId, {}),
      listUsers(userAccount),
      removeUser(userAccount, userId),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, userId),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to init any user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const user = await addUser(account, {});
    expect(user).toBeHttp({ statusCode: 200 });
    const userId = user.data.id;

    const action = 'user:init';
    const resource = `/account/${account.accountId}/user`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedInit = await initUser(userAccount, userId);
    expect(allowedInit).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, userId),
      updateUser(userAccount, userId, {}),
      listUsers(userAccount),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to a user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const user = await addUser(account, {});
    expect(user).toBeHttp({ statusCode: 200 });
    const userId = user.data.id;

    const action = 'user:*';
    const resource = `/account/${account.accountId}/user/${userId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedGet = await getUser(userAccount, userId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedUpdate = await updateUser(userAccount, userId, { firstName: 'test user' });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const allowedInit = await initUser(userAccount, userId);
    expect(allowedInit).toBeHttp({ statusCode: 200 });

    const allowedRemove = await removeUser(userAccount, userId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      listUsers(userAccount),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to any user should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'user:*';
    const resource = `/account/${account.accountId}/user`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const user = await addUser(userAccount, {});
    expect(user).toBeHttp({ statusCode: 200 });
    const userId = user.data.id;

    const allowedGet = await getUser(userAccount, userId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedList = await listUsers(userAccount);
    expect(allowedList).toBeHttp({ statusCode: 200 });

    const allowedUpdate = await updateUser(userAccount, userId, { firstName: 'test user' });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const allowedInit = await initUser(userAccount, userId);
    expect(allowedInit).toBeHttp({ statusCode: 200 });

    const allowedRemove = await removeUser(userAccount, userId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to add any client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'client:add';
    const resource = `/account/${account.accountId}/client`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedAdd = await addClient(userAccount, {});
    expect(allowedAdd).toBeHttp({ statusCode: 200 });
    const clientId = allowedAdd.data.id;

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      getClient(userAccount, clientId),
      listClients(userAccount, {}),
      updateClient(userAccount, clientId, {}),
      removeClient(userAccount, clientId),
      initClient(userAccount, clientId),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to add any client should not be able to give that client any additional access', async () => {
    const { account, boundaryId, function1Id } = getEnv();
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const clientAction = 'client:add';
    const clientResource = `/account/${account.accountId}/client`;

    const additionalAccess = {
      action: 'function:get',
      resource: [
        `/account/${account.accountId}/subscription/${account.subscriptionId}`,
        `/boundary/${boundaryId}/function/${function1Id}`,
      ].join(''),
    };

    const user = await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: clientAction, resource: clientResource }, additionalAccess] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);
    const userId = user.data.id;

    const allowedAdd = await addClient(userAccount, { access: { allow: [additionalAccess] } });
    expect(allowedAdd).toBeHttp({ statusCode: 200 });

    const allowStatements = [
      {
        action: 'function:get',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function`,
      },
      {
        action: 'function:get',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/another-function`,
      },
      {
        action: 'function:put',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${function1Id}`,
      },
    ];

    const results = await Promise.all(
      allowStatements.map((allow) => addClient(userAccount, { access: { allow: [allow] } }))
    );

    results.forEach((result: any, index: number) => {
      const { action, resource } = allowStatements[index];
      expect(result).toBeUnauthorizedToGrantError(userId, action, resource);
    });
  }, 180000);

  test('A user with access to get a client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const client = await addClient(account, {});
    expect(client).toBeHttp({ statusCode: 200 });
    const clientId = client.data.id;

    const action = 'client:get';
    const resource = `/account/${account.accountId}/client/${clientId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedGet = await getClient(userAccount, clientId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, clientId, {}),
      removeClient(userAccount, clientId),
      initClient(userAccount, clientId),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to get any client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const client = await addClient(account, {});
    expect(client).toBeHttp({ statusCode: 200 });
    const clientId = client.data.id;

    const action = 'client:get';
    const resource = `/account/${account.accountId}/client`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedGet = await getClient(userAccount, clientId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedGet2 = await getClient(userAccount, 'clt-1234567890123456');
    expect(allowedGet2.status).toBe(404);

    const allowedList = await listClients(userAccount, {});
    expect(allowedList).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      updateClient(userAccount, clientId, {}),
      removeClient(userAccount, clientId),
      initClient(userAccount, clientId),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to update a client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const client = await addClient(account, {});
    expect(client).toBeHttp({ statusCode: 200 });
    const clientId = client.data.id;

    const action = 'client:update';
    const resource = `/account/${account.accountId}/client/${clientId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedUpdate = await updateClient(userAccount, clientId, { displayName: 'test client' });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount),
      removeUser(userAccount, 'usr-1234567890123456'),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, clientId),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, clientId),
      initClient(userAccount, clientId),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to update any client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const client = await addClient(account, {});
    expect(client).toBeHttp({ statusCode: 200 });
    const clientId = client.data.id;

    const action = 'client:update';
    const resource = `/account/${account.accountId}/client`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedUpdate = await updateClient(userAccount, clientId, { displayName: 'test client' });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, clientId),
      listClients(userAccount, {}),
      removeClient(userAccount, clientId),
      initClient(userAccount, clientId),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to update any client should not be able to give that client any additional access', async () => {
    const { account, boundaryId, function1Id } = getEnv();
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const clientAction = 'client:update';
    const clientResource = `/account/${account.accountId}/client`;

    const additionalAccess = {
      action: 'function:get',
      resource: [
        `/account/${account.accountId}/subscription/${account.subscriptionId}`,
        `/boundary/${boundaryId}/function/${function1Id}`,
      ].join(''),
    };

    const user = await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action: clientAction, resource: clientResource }, additionalAccess] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);
    const userId = user.data.id;

    const newClient = await addClient(account, {});
    const newClientId = newClient.data.id;

    const allowedUpdate = await updateClient(userAccount, newClientId, { access: { allow: [additionalAccess] } });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const allowStatements = [
      {
        action: 'function:get',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function`,
      },
      {
        action: 'function:get',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/another-function`,
      },
      {
        action: 'function:put',
        resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${function1Id}`,
      },
    ];

    const results = await Promise.all(
      allowStatements.map((allow) => updateClient(userAccount, newClientId, { access: { allow: [allow] } }))
    );

    results.forEach((result: any, index: number) => {
      const { action, resource } = allowStatements[index];
      expect(result).toBeUnauthorizedToGrantError(userId, action, resource);
    });
  }, 180000);

  test('A user with access to remove a client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const client = await addClient(account, {});
    expect(client).toBeHttp({ statusCode: 200 });
    const clientId = client.data.id;

    const action = 'client:delete';
    const resource = `/account/${account.accountId}/client/${clientId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedRemove = await removeClient(userAccount, clientId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      listUsers(userAccount),
      removeUser(userAccount, 'usr-1234567890123456'),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, clientId),
      listClients(userAccount, {}),
      updateClient(userAccount, clientId, {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, clientId),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to remove any client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const client = await addClient(account, {});
    expect(client).toBeHttp({ statusCode: 200 });
    const clientId = client.data.id;

    const action = 'client:delete';
    const resource = `/account/${account.accountId}/client`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedRemove = await removeClient(userAccount, clientId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      listUsers(userAccount),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, clientId),
      listClients(userAccount, {}),
      updateClient(userAccount, clientId, {}),
      initClient(userAccount, clientId),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to init a client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const client = await addClient(account, {});
    expect(client).toBeHttp({ statusCode: 200 });
    const clientId = client.data.id;

    const action = 'client:init';
    const resource = `/account/${account.accountId}/client/${clientId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedInit = await initClient(userAccount, clientId);
    expect(allowedInit).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      listUsers(userAccount),
      removeUser(userAccount, 'usr-1234567890123456'),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, clientId),
      listClients(userAccount, {}),
      updateClient(userAccount, clientId, {}),
      removeClient(userAccount, clientId),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with access to init any client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const client = await addClient(account, {});
    expect(client).toBeHttp({ statusCode: 200 });
    const clientId = client.data.id;

    const action = 'client:init';
    const resource = `/account/${account.accountId}/client`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedInit = await initClient(userAccount, clientId);
    expect(allowedInit).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, clientId),
      listClients(userAccount, {}),
      updateClient(userAccount, clientId, {}),
      removeClient(userAccount, clientId),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to a client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;

    const client = await addClient(account, {});
    expect(client).toBeHttp({ statusCode: 200 });
    const clientId = client.data.id;

    const action = 'client:*';
    const resource = `/account/${account.accountId}/client/${clientId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedGet = await getClient(userAccount, clientId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedUpdate = await updateClient(userAccount, clientId, { displayName: 'test client' });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const allowedInit = await initClient(userAccount, clientId);
    expect(allowedInit).toBeHttp({ statusCode: 200 });

    const allowedRemove = await removeClient(userAccount, clientId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      listUsers(userAccount),
      getUser(userAccount, 'usr-1234567890123456'),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      listClients(userAccount, {}),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to any client should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'client:*';
    const resource = `/account/${account.accountId}/client`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const client = await addClient(userAccount, {});
    expect(client).toBeHttp({ statusCode: 200 });
    const clientId = client.data.id;

    const allowedGet = await getClient(userAccount, clientId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedList = await listClients(userAccount);
    expect(allowedList).toBeHttp({ statusCode: 200 });

    const allowedUpdate = await updateClient(userAccount, clientId, { displayName: 'test client' });
    expect(allowedUpdate).toBeHttp({ statusCode: 200 });

    const allowedInit = await initClient(userAccount, clientId);
    expect(allowedInit).toBeHttp({ statusCode: 200 });

    const allowedRemove = await removeClient(userAccount, clientId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      listIssuers(userAccount),
      addIssuer(userAccount, 'test-issuer', { jsonKeysUrl: 'some-key' }),
      getIssuer(userAccount, 'issuerId'),
      updateIssuer(userAccount, 'issuerId', {}),
      removeIssuer(userAccount, 'issuerId'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to all storage should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:*';
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const storageId = `test-${random()}`;
    const allowedSet = await setStorage(userAccount, storageId, { data: { msg: 'hello world' } });
    expect(allowedSet).toBeHttp({ statusCode: 200 });

    const allowedGet = await getStorage(userAccount, storageId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedList = await listStorage(userAccount);
    expect(allowedList).toBeHttp({ statusCode: 200 });

    const allowedRemove = await removeStorage(userAccount, storageId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with get access to all storage should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:get';
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const storageId = `test-${random()}`;
    const allowedSet = await setStorage(account, storageId, { data: { msg: 'hello world' } });
    expect(allowedSet).toBeHttp({ statusCode: 200 });

    const allowedGet = await getStorage(userAccount, storageId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedList = await listStorage(userAccount);
    expect(allowedList).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with put access to all storage should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:put';
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const storageId = `test-${random()}`;
    const allowedSet = await setStorage(userAccount, storageId, { data: { msg: 'hello world' } });
    expect(allowedSet).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with delete access to all storage should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:delete';
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const storageId = `test-${random()}`;
    const allowedSet = await setStorage(account, storageId, { data: { msg: 'hello world' } });
    expect(allowedSet).toBeHttp({ statusCode: 200 });

    const allowedRemove = await removeStorage(userAccount, storageId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      setStorage(userAccount, 'some-id', { data: 'hello world' }),
      getStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to some storage id should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:*';
    const storageId = `test-${random()}`;
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedSet = await setStorage(userAccount, storageId, { data: { msg: 'hello world' } });
    expect(allowedSet).toBeHttp({ statusCode: 200 });

    const allowedGet = await getStorage(userAccount, storageId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const allowedRemove = await removeStorage(userAccount, storageId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      setStorage(userAccount, 'some-id', { data: 'hello world' }),
      getStorage(userAccount, 'some-id'),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with get access to some storage id should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:get';
    const storageId = `test-${random()}`;
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedSet = await setStorage(account, storageId, { data: { msg: 'hello world' } });
    expect(allowedSet).toBeHttp({ statusCode: 200 });

    const allowedGet = await getStorage(userAccount, storageId);
    expect(allowedGet).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, 'some-id'),
      setStorage(userAccount, 'some-id', { data: 'hello' }),
      removeStorage(userAccount, 'some-id'),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with put access to some storage id should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:put';
    const storageId = `test-${random()}`;
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedSet = await setStorage(userAccount, storageId, { data: { msg: 'hello world' } });
    expect(allowedSet).toBeHttp({ statusCode: 200 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      setStorage(userAccount, 'some-id', { data: 'hello world' }),
      getStorage(userAccount, 'some-id'),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with delete access to some storage id should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:delete';
    const storageId = `test-${random()}`;
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const allowedSet = await setStorage(account, storageId, { data: { msg: 'hello world' } });
    expect(allowedSet).toBeHttp({ statusCode: 200 });

    const allowedRemove = await removeStorage(userAccount, storageId);
    expect(allowedRemove).toBeHttp({ statusCode: 204 });

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      setStorage(userAccount, 'some-id', { data: 'hello world' }),
      getStorage(userAccount, 'some-id'),
      removeStorage(userAccount, 'some-id'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with full access to some storage path should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:*';
    const storageId = `test-${random()}`;
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}/a/b/c`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      setStorage(userAccount, storageId, { data: 'hello world' }),
      getStorage(userAccount, storageId),
      removeStorage(userAccount, storageId),
      removeStorage(userAccount, storageId, 'a/b'),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with get access to some storage path should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:get';
    const storageId = `test-${random()}`;
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}/a/b/c`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      getStorage(userAccount, storageId),
      setStorage(userAccount, storageId, { data: 'hello' }),
      removeStorage(userAccount, storageId),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with put access to some storage path should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:put';
    const storageId = `test-${random()}`;
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}/a/b/c`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      setStorage(userAccount, storageId, { data: 'hello world' }),
      getStorage(userAccount, storageId),
      removeStorage(userAccount, storageId),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);

  test('A user with delete access to some storage path should not have any additional access', async () => {
    const subject = `sub-${random({ lengthInBytes: 8 })}`;
    const action = 'storage:delete';
    const storageId = `test-${random()}`;
    const resource = `/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}/a/b/c`;
    await addUser(account, {
      identities: [{ issuerId: testIssuer.issuerId, subject }],
      access: { allow: [{ action, resource }] },
    });
    const jwt = await testIssuer.getAccessToken(subject);
    const userAccount = cloneWithAccessToken(account, jwt);

    const results = await Promise.all([
      putFunction(userAccount, boundaryId, function1Id, {}),
      getFunction(userAccount, boundaryId, function1Id),
      getLogs(userAccount, boundaryId, undefined, true),
      getLogs(userAccount, boundaryId, function1Id, true),
      getFunctionLocation(userAccount, boundaryId, function1Id),
      deleteFunction(userAccount, boundaryId, function1Id),
      listFunctions(userAccount),
      addIssuer(userAccount, 'test-issuer', {}),
      listIssuers(userAccount),
      getIssuer(userAccount, testIssuer.issuerId),
      updateIssuer(userAccount, 'test-issuer', {}),
      removeIssuer(userAccount, 'test-issuer'),
      addUser(userAccount, {}),
      getUser(userAccount, 'usr-1234567890123456'),
      listUsers(userAccount, {}),
      updateUser(userAccount, 'usr-1234567890123456', {}),
      removeUser(userAccount, 'usr-1234567890123456'),
      initUser(userAccount, 'usr-1234567890123456'),
      addClient(userAccount, {}),
      getClient(userAccount, 'clt-1234567890123456'),
      listClients(userAccount, {}),
      updateClient(userAccount, 'clt-1234567890123456', {}),
      removeClient(userAccount, 'clt-1234567890123456'),
      initClient(userAccount, 'clt-1234567890123456'),
      listAudit(userAccount),
      setStorage(userAccount, storageId, { data: 'hello world' }),
      getStorage(userAccount, storageId),
      removeStorage(userAccount, storageId),
      listStorage(userAccount),
    ]);

    for (const result of results) {
      expect(result).toBeUnauthorizedError();
    }
  }, 180000);
});
