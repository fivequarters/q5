import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';

import { decodeJwt } from '@5qtrs/jwt';

import * as Constants from '@5qtrs/constants';
const Permissions = Constants.Permissions;
import * as AuthZ from './authorizations';

import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

import { FakeAccount, IAccount, resolveAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import { deleteAllFunctions, deleteFunction, getFunction, getFunctionLocation, getMe, putFunction } from './sdk';

let account: IAccount = FakeAccount;
const { getAccount, getBoundary } = setupEnvironment();
const function1Id = 'test-fun-runas-1';

const specFuncReturnCtx = {
  functionPermissions: AuthZ.permFunctionWild,
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx.fusebit }; };',
    },
  },
};

describe('runas', () => {
  test('normal function has no permissions added', async () => {
    account = getAccount();
    const boundaryId = getBoundary();
    const specNoPerm = Constants.duplicate({}, specFuncReturnCtx);
    delete specNoPerm.functionPermissions;
    const create = await putFunction(account, boundaryId, function1Id, specNoPerm);
    expect(create.status).toEqual(200);
    let url: string;
    let response;

    url = create.data.location;

    // Check the run variant
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.functionAccessToken).toBeUndefined();
  }, 180000);

  test('jwt created with permissions', async () => {
    account = getAccount();
    const boundaryId = getBoundary();
    let response = await putFunction(account, boundaryId, function1Id, specFuncReturnCtx);
    httpExpect(response, { statusCode: 200 });
    let url: string;
    let token: string;

    url = response.data.location;

    // Get the token
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.functionAccessToken).not.toBeUndefined();
    token = response.data.functionAccessToken;

    // console.log( `curl ${account.baseUrl}/v1/account/${account.accountId}/me -H 'Authorization: Bearer ${token}'`);
    // console.log(`JWT: ${JSON.stringify(decodeJwt(token, false, true), null, 2)}`);
    // const r = (await getMe(account, response.data.functionAccessToken)).data;

    // Make sure the permissions are correctly encoded in the JWT.
    let decoded = decodeJwt(token);
    expect(decoded[Constants.JWT_PERMISSION_CLAIM]).toMatchObject(specFuncReturnCtx.functionPermissions);

    // Save the current token
    const oldToken = account.accessToken;

    // Use the new token to get the function specification
    account.accessToken = token;
    response = await getFunction(account, boundaryId, function1Id);
    httpExpect(response, { statusCode: 200 });
    account.accessToken = oldToken;

    // Update the permissions
    const specGet = Constants.duplicate({}, specFuncReturnCtx);
    specGet.functionPermissions = AuthZ.permFunctionGet;
    response = await putFunction(account, boundaryId, function1Id, specGet);
    httpExpect(response, { statusCode: 200 });

    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.functionAccessToken).not.toBeUndefined();
    token = response.data.functionAccessToken;

    // Did the permissions update?
    decoded = decodeJwt(token);
    expect(decoded[Constants.JWT_PERMISSION_CLAIM]).toMatchObject(specGet.functionPermissions);

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
    spec.functionPermissions = AuthZ.permFunctionPutLimited(Permissions.putFunction, account, boundaryId);
    let response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });

    const url = response.data.location;
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.functionAccessToken).not.toBeUndefined();
    const limitedToken = response.data.functionAccessToken;

    spec.functionPermissions = undefined;
    account.accessToken = limitedToken;

    // Create a function in the boundary, succeed
    response = await putFunction(account, boundaryId, function1Id + '2', spec);
    httpExpect(response, { statusCode: 200 });

    // Create a function with different permissions, fail
    spec.functionPermissions = AuthZ.permFunctionGet;
    response = await putFunction(account, boundaryId, function1Id + '3', spec);
    httpExpect(response, { statusCode: 403 });

    // Create a function with too many permissions, fail
    spec.functionPermissions = AuthZ.permFunctionPutLimited(Permissions.allFunction, account, boundaryId);
    response = await putFunction(account, boundaryId, function1Id + '4', spec);
    httpExpect(response, { statusCode: 403 });

    // Create a function with higher path permissions, fail
    spec.functionPermissions = AuthZ.permFunctionPutLimitedHigher(Permissions.putFunction, account);
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
    spec.functionPermissions = AuthZ.permFunctionPutLimited(Permissions.allFunction, account, boundaryId);
    let response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });

    const url = response.data.location;
    response = await request(url);
    httpExpect(response, { statusCode: 200 });
    expect(response.data.functionAccessToken).not.toBeUndefined();
    const limitedToken = response.data.functionAccessToken;

    spec.functionPermissions = AuthZ.permFunctionPut;
    account.accessToken = limitedToken;

    // Create a function with fewer permissions, succeed
    spec.functionPermissions = AuthZ.permFunctionPutLimited(Permissions.getFunction, account, boundaryId);
    response = await putFunction(account, boundaryId, function1Id + '2', spec);
    httpExpect(response, { statusCode: 200 });
    account.accessToken = oldToken;
  }, 180000);

  test('self-minted jwt with lower permissions', async () => {
    const profile = await FusebitProfile.create();
    let executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, AuthZ.permFunctionPut);

    // Put a function using the put-only token
    account = getAccount();
    const boundaryId = getBoundary();
    const oldToken = account.accessToken;

    // Use the downgraded token
    account.accessToken = executionProfile.accessToken;

    // Try to create a function with a superset of permissions
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.functionPermissions = AuthZ.permFunctionWild;
    let response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 403 });

    // Try to create a function with no permissions
    spec.functionPermissions = undefined;
    response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });

    // Validate that the token doesn't have permission to get the created function.
    response = await getFunction(account, boundaryId, function1Id);
    httpExpect(response, { statusCode: 403 });

    // Mint a new token with GET and validate it can retrieve the function
    executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, AuthZ.permFunctionGet);
    account.accessToken = executionProfile.accessToken;
    response = await getFunction(account, boundaryId, function1Id);
    httpExpect(response, { statusCode: 200 });

    // And denied to function:put
    response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 403 });

    // Restore the old token.
    account.accessToken = oldToken;
  }, 180000);
});
