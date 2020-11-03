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

const specFuncReturnCtx = {
  permissions: { allow: [{ action: '*', resource: '/' }] },
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx }; };',
    },
  },
};

const permFunctionGet = { allow: [{ action: 'function:get', resource: '/' }] };
const permFunctionPut = { allow: [{ action: 'function:put', resource: '/' }] };
const permFunctionWildcard = { allow: [{ action: 'function:*', resource: '/' }] };

const permFunctionPutLimited = (perm: string, acc: IAccount, boundaryId: string) => ({
  allow: [
    { action: perm, resource: `/account/${acc.accountId}/subscription/${acc.subscriptionId}/boundary/${boundaryId}/` },
  ],
});

const permFunctionPutLimitedHigher = (perm: string, acc: IAccount) => ({
  allow: [{ action: perm, resource: `/account/${acc.accountId}/` }],
});

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
    let response = await putFunction(account, boundaryId, function1Id, specFuncReturnCtx);
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
    expect(decoded[Constants.JWT_PERMISSION_CLAIM]).toMatchObject(specFuncReturnCtx.permissions);

    // Save the current token
    const oldToken = account.accessToken;

    // Use the new token to get the function specification
    account.accessToken = token;
    response = await getFunction(account, boundaryId, function1Id);
    httpExpect(response, { statusCode: 200 });
    account.accessToken = oldToken;

    // Update the permissions
    const specGet = Constants.duplicate({}, specFuncReturnCtx);
    specGet.permissions = permFunctionGet;
    response = await putFunction(account, boundaryId, function1Id, specGet);
    httpExpect(response, { statusCode: 200 });

    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).not.toBeUndefined();
    token = response.data.headers.authorization;

    // Did the permissions update?
    decoded = decodeJwt(token);
    expect(decoded[Constants.JWT_PERMISSION_CLAIM]).toMatchObject(specGet.permissions);

    // Can the function still be gotten?
    account.accessToken = token;
    response = await getFunction(account, boundaryId, function1Id);
    httpExpect(response, { statusCode: 200 });

    // Attempt to do something not allowed.
    response = await putFunction(account, boundaryId, function1Id, specGet);
    httpExpect(response, { statusCode: 403 });
    account.accessToken = oldToken;
  }, 180000);

  test('permissions restrictions', async () => {
    // Put a function that has a broad set of permissions
    account = getAccount();
    const boundaryId = getBoundary();
    const oldToken = account.accessToken;

    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.permissions = permFunctionPutLimited('function:put', account, boundaryId);
    let response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });
    const url = tweakUrl(response.data.location);
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).not.toBeUndefined();
    const limitedToken = response.data.headers.authorization;

    spec.permissions = undefined;
    account.accessToken = limitedToken;

    // Create a function in the boundary, succeed
    response = await putFunction(account, boundaryId, function1Id + '2', spec);
    httpExpect(response, { statusCode: 200 });

    // Create a function with different permissions, fail
    spec.permissions = permFunctionGet;
    response = await putFunction(account, boundaryId, function1Id + '3', spec);
    httpExpect(response, { statusCode: 403 });

    // Create a function with too many permissions, fail
    spec.permissions = permFunctionPutLimited('function:*', account, boundaryId);
    response = await putFunction(account, boundaryId, function1Id + '4', spec);
    httpExpect(response, { statusCode: 403 });

    // Create a function with higher path permissions, fail
    spec.permissions = permFunctionPutLimitedHigher('function:put', account);
    response = await putFunction(account, boundaryId, function1Id + '5', spec);
    httpExpect(response, { statusCode: 403 });

    // Use that function to create another function with a narrower set of permissions, pass
    // Attempt to use that function to create a function with a broader set of permissions, fail.
    // Test function:* <-> function:get, * <-> function:get, and path variances.
    account.accessToken = oldToken;
  }, 180000);

  test('more permissions restrictions', async () => {
    // Put a function that has a broad set of permissions
    account = getAccount();
    const boundaryId = getBoundary();
    const oldToken = account.accessToken;

    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.permissions = permFunctionPutLimited('function:*', account, boundaryId);
    let response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });
    const url = tweakUrl(response.data.location);
    console.log(url);
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.headers.authorization).not.toBeUndefined();
    const limitedToken = response.data.headers.authorization;

    spec.permissions = permFunctionPut;
    account.accessToken = limitedToken;

    // Create a function with fewer permissions, succeed
    spec.permissions = permFunctionPutLimited('function:get', account, boundaryId);
    response = await putFunction(account, boundaryId, function1Id + '2', spec);
    httpExpect(response, { statusCode: 200 });
    account.accessToken = oldToken;
  }, 180000);
});
