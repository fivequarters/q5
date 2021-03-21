import { request } from '@5qtrs/request';
import { decodeJwt } from '@5qtrs/jwt';
import * as Constants from '@5qtrs/constants';
import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

import * as AuthZ from './authz';

import { disableFunctionUsageRestriction, getFunction, getFunctionLocation, putFunction } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());

  // Invocations in this test do not care about the function body, only the metadata, which is not subject to
  // function usage restrictions.
  disableFunctionUsageRestriction();
});

const Permissions = Constants.Permissions;

const specFuncReturnCtx = {
  security: {
    functionPermissions: AuthZ.permFunctionWild,
  },
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx.fusebit }; };',
    },
  },
};

describe('Runas', () => {
  test('normal function has no permissions added', async () => {
    const specNoPerm = Constants.duplicate({}, specFuncReturnCtx);
    delete specNoPerm.security.functionPermissions;
    const create = await putFunction(account, boundaryId, function1Id, specNoPerm);
    expect(create).toBeHttp({ statusCode: 200 });
    let url: string;
    let response;

    url = create.data.location;

    // Check the run variant
    response = await request(url);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.functionAccessToken).toBeUndefined();
  }, 180000);

  test('jwt created with permissions', async () => {
    let response = await putFunction(account, boundaryId, function1Id, specFuncReturnCtx);
    expect(response).toBeHttp({ statusCode: 200 });
    let url: string;
    let token: string;

    url = response.data.location;

    // Get the token
    response = await request(url);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.functionAccessToken).not.toBeUndefined();
    token = response.data.functionAccessToken;

    // Make sure the permissions are correctly encoded in the JWT.
    let decoded = decodeJwt(token);
    expect(decoded[Constants.JWT_PERMISSION_CLAIM]).toMatchObject(specFuncReturnCtx.security.functionPermissions);

    // Save the current token
    const oldToken = account.accessToken;

    // Use the new token to get the function specification
    account.accessToken = token;
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });
    account.accessToken = oldToken;

    // Update the permissions
    const specGet = Constants.duplicate({}, specFuncReturnCtx);
    specGet.security.functionPermissions = AuthZ.permFunctionGet;
    response = await putFunction(account, boundaryId, function1Id, specGet);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await request(url);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.functionAccessToken).not.toBeUndefined();
    token = response.data.functionAccessToken;

    // Did the permissions update?
    decoded = decodeJwt(token);
    expect(decoded[Constants.JWT_PERMISSION_CLAIM]).toMatchObject(specGet.security.functionPermissions);

    // Can the function still be gotten?
    account.accessToken = token;
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });

    // Attempt to do something not allowed.
    response = await putFunction(account, boundaryId, function1Id, specGet);
    expect(response).toBeHttp({ statusCode: 403 });
  }, 180000);

  test('permissions restrictions', async () => {
    // Put a function that has a broad set of permissions
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.security.functionPermissions = AuthZ.permFunctionPutLimited(Permissions.putFunction, account, boundaryId);
    let response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 200 });

    const url = response.data.location;
    response = await request(url);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.functionAccessToken).not.toBeUndefined();
    const limitedToken = response.data.functionAccessToken;

    spec.security.functionPermissions = undefined;
    account.accessToken = limitedToken;

    // Create a function in the boundary, with the same permissions, succeed
    spec.security.functionPermissions = AuthZ.permFunctionPutLimited(Permissions.putFunction, account, boundaryId);
    response = await putFunction(account, boundaryId, function1Id + '2', spec);
    expect(response).toBeHttp({ statusCode: 200 });

    // Create a function with different permissions, fail
    spec.security.functionPermissions = AuthZ.permFunctionGet;
    response = await putFunction(account, boundaryId, function1Id + '3', spec);
    expect(response).toBeHttp({ statusCode: 400 });

    // Create a function with too many permissions, fail
    spec.security.functionPermissions = AuthZ.permFunctionPutLimited(Permissions.allFunction, account, boundaryId);
    response = await putFunction(account, boundaryId, function1Id + '4', spec);
    expect(response).toBeHttp({ statusCode: 400 });

    // Create a function with higher path permissions, fail
    spec.security.functionPermissions = AuthZ.permFunctionPutLimitedHigher(Permissions.putFunction, account);
    response = await putFunction(account, boundaryId, function1Id + '5', spec);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('more permissions restrictions', async () => {
    // Put a function that has a broad set of permissions
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.security.functionPermissions = AuthZ.permFunctionPutLimited(Permissions.allFunction, account, boundaryId);
    let response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 200 });

    const url = response.data.location;
    response = await request(url);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.functionAccessToken).not.toBeUndefined();
    const limitedToken = response.data.functionAccessToken;

    spec.security.functionPermissions = AuthZ.permFunctionPut;
    account.accessToken = limitedToken;

    // Create a function with fewer permissions, succeed
    spec.security.functionPermissions = AuthZ.permFunctionPutLimited(Permissions.getFunction, account, boundaryId);
    response = await putFunction(account, boundaryId, function1Id + '2', spec);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('self-minted jwt with lower permissions', async () => {
    const profile = await FusebitProfile.create();
    let executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, AuthZ.permFunctionPut);

    // Put a function using the put-only token
    // Use the downgraded token
    account.accessToken = executionProfile.accessToken;

    // Try to create a function with a superset of permissions
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.security.functionPermissions = AuthZ.permFunctionWild;
    let response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 400 });

    // Try to create a function with no permissions
    spec.security.functionPermissions = undefined;
    response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 200 });

    // Validate that the token doesn't have permission to get the created function.
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 403 });

    // Mint a new token with GET and validate it can retrieve the function
    executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, AuthZ.permFunctionGet);
    account.accessToken = executionProfile.accessToken;
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });

    // And denied to function:put
    response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 403 });
  }, 180000);
});
