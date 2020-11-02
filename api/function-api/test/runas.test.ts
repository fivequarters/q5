import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';

import { decodeJwt } from '@5qtrs/jwt';

import { FakeAccount, IAccount, resolveAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import { getMe, deleteAllFunctions, deleteFunction, getFunction, getFunctionLocation, putFunction } from './sdk';

let account: IAccount = FakeAccount;
const { getAccount, getBoundary } = setupEnvironment();
const function1Id = 'test-fun-runas-1';

// Convert '/run' to '/exec/acc-1234'.
const tweakUrl = (url: string) => url.replace('run', `exec/${account.accountId}`);

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx }; };',
    },
  },
};

const helloWorldRunas = {
  permissions: { allow: [{ action: '*', resource: '/' }] },
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx }; };',
    },
  },
};

describe('runas', () => {
  test('normal function has no permissions added', async () => {
    account = getAccount();
    const boundaryId = getBoundary();
    const create = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(create.status).toEqual(200);
    let url: string;
    let response;

    url = create.data.location;

    // Check the run variant
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).toBeUndefined();

    // Check the exec variant
    url = tweakUrl(url);
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).toBeUndefined();
  }, 180000);

  test('jwt created with permissions', async () => {
    account = getAccount();
    const boundaryId = getBoundary();
    const create = await putFunction(account, boundaryId, function1Id, helloWorldRunas);
    httpExpect(create, { statusCode: 200 });
    let url: string;
    let response;

    url = create.data.location;

    // Check the run variant
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).toBeUndefined();

    // Check the exec variant
    url = tweakUrl(url);
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).not.toBeUndefined();
    const token = response.data.headers.authorization;
    // console.log( `curl ${account.baseUrl}/v1/account/${account.accountId}/me -H 'Authorization: Bearer ${token}'`);
    console.log(`JWT: ${JSON.stringify(decodeJwt(token), null, 2)}`);
    // const r = (await getMe(account, response.data.headers.authorization)).data;
    account.accessToken = token;
    response = await getFunction(account, boundaryId, function1Id);
    httpExpect(response, { statusCode: 200 });
    console.log(`${JSON.stringify(response.data)}`);
  }, 180000);
});
