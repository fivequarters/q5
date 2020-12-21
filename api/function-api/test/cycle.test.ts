import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';

import { cloneWithAccessToken } from './accountResolver';
import {
  addIssuer,
  removeIssuer,
  addUser,
  cleanUpUsers,
  cleanUpClients,
  cleanUpStorage,
  createTestJwksIssuer,
  cleanUpHostedIssuers,
  cleanUpIssuers,
  disableFunctionUsageRestriction,
  callFunction,
  getFunction,
  putFunction,
} from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

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
  await cleanUpIssuers(account);
}, 200000);

// These tests are used to exercise various race conditions within the system, as they are discovered, and are
// not intended to be executed under normal circumstances.
describe.skip('cycle test', () => {
  test('function put/execute cycle', async () => {
    disableFunctionUsageRestriction();
    const spec1 = {
      nodejs: { files: { 'index.js': `module.exports = async (ctx) => { return { body: "teapot", status: 200}; };` } },
    };
    const spec2 = {
      nodejs: { files: { 'index.js': `module.exports = async (ctx) => { return { body: "kettle", status: 200}; };` } },
    };

    let response;

    const callCounts: [number, number][] = [];

    const pollForData = async (url: string, data: string) => {
      let i = 0;
      let res: any;
      const timeStart = Date.now();
      do {
        i++;
        res = await request(url);
        if (res.data === data) {
          break;
        }
      } while (res.status === 200);

      if (i > 1) {
        callCounts.push([i, Date.now() - timeStart]);
      }

      return res;
    };

    // Failure is usually seen before cycle 50
    for (let i = 0; i < 5; i++) {
      response = await putFunction(account, boundaryId, function1Id, spec1);
      expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
      response = await pollForData(response.data.location, 'teapot');

      response = await putFunction(account, boundaryId, function1Id, spec2);
      expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
      response = await pollForData(response.data.location, 'kettle');
    }

    expect(callCounts).toMatchObject([]);
  }, 300000);

  test('user/issuer create cycle', async () => {
    // Failure is usually seen before cycle 500.
    for (let cnt = 0; cnt < 500; cnt++) {
      cnt++;
      const subject = `sub-${random({ lengthInBytes: 8 })}`;
      const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
      const action = 'issuer:add';
      const resource = `/account/${account.accountId}`;
      const user = await addUser(account, {
        identities: [{ issuerId: testIssuer.issuerId, subject }],
        access: { allow: [{ action, resource }] },
      });
      const jwt = await testIssuer.getAccessToken(subject);
      const userAccount = cloneWithAccessToken(account, jwt);

      const allowedAdd = await addIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' });

      if (allowedAdd.status !== 200) {
        const allowedAdd2 = await addIssuer(userAccount, issuerId, { jsonKeysUrl: 'some-key' });
        console.log(`${cnt}. ${JSON.stringify(allowedAdd2)}`);
      }

      expect(user).toBeHttp({ statusCode: 200 });
      expect(allowedAdd).toBeHttp({ statusCode: 200 });
    }
  }, 180000000);
});
