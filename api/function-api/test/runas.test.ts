import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';

import { decodeJwt } from '@5qtrs/jwt';

import * as Constants from '@5qtrs/constants';

import { FakeAccount, IAccount, resolveAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import { deleteAllFunctions, deleteFunction, getFunction, getFunctionLocation, getMe, putFunction } from './sdk';

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

const helloWorldRunas2 = {
  permissions: { allow: [{ action: 'function:get', resource: '/' }] },
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
    let response = await putFunction(account, boundaryId, function1Id, helloWorldRunas);
    httpExpect(response, { statusCode: 200 });
    let url: string;
    let token: string;

    url = response.data.location;

    // Check the run variant
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).toBeUndefined();

    // Get the token
    url = tweakUrl(url);
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).not.toBeUndefined();
    token = response.data.headers.authorization;

    // console.log( `curl ${account.baseUrl}/v1/account/${account.accountId}/me -H 'Authorization: Bearer ${token}'`);
    // console.log(`JWT: ${JSON.stringify(decodeJwt(token), null, 2)}`);
    // const r = (await getMe(account, response.data.headers.authorization)).data;

    // Make sure the permissions are correctly encoded in the JWT.
    let decoded = decodeJwt(token);
    expect(decoded[Constants.JWT_PERMISSION_CLAIM]).toMatchObject(helloWorldRunas.permissions);

    // Save the current token
    const oldToken = account.accessToken;

    // Use the new token to get the function specification
    account.accessToken = token;
    response = await getFunction(account, boundaryId, function1Id);
    httpExpect(response, { statusCode: 200 });
    account.accessToken = oldToken;

    // Update the permissions
    response = await putFunction(account, boundaryId, function1Id, helloWorldRunas2);
    httpExpect(response, { statusCode: 200 });

    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).not.toBeUndefined();
    token = response.data.headers.authorization;

    // Did the permissions update?
    decoded = decodeJwt(token);
    expect(decoded[Constants.JWT_PERMISSION_CLAIM]).toMatchObject(helloWorldRunas2.permissions);

    // Can the function still be gotten?
    account.accessToken = token;
    response = await getFunction(account, boundaryId, function1Id);
    httpExpect(response, { statusCode: 200 });

    // Attempt to do something not allowed.
    response = await putFunction(account, boundaryId, function1Id, helloWorldRunas2);
    httpExpect(response, { statusCode: 403 });
  }, 180000);
});
