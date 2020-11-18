import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';

import { decodeJwt } from '@5qtrs/jwt';

import * as Constants from '@5qtrs/constants';
const Permissions = Constants.Permissions;

import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

import { FakeAccount, IAccount, resolveAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import { callFunction, getFunction, putFunction } from './sdk';

let account: IAccount = FakeAccount;
const { getAccount, getBoundary } = setupEnvironment();
const function1Id = 'test-fun-exec-1';

const specFuncReturnCtx = {
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx.fusebit }; };',
    },
  },
};

/* XXX Should exe be a requirement for put when adding an exe requirement to a function? */

const reqFunctionWild = { action: Permissions.allFunction, resource: '/' };
const reqFunctionGet = { action: Permissions.getFunction, resource: '/' };
const reqFunctionPut = { action: Permissions.putFunction, resource: '/' };
const reqFunctionExe = { action: Permissions.exeFunction, resource: '/' };

const permFunctionWildcard = { allow: [reqFunctionWild] };
const permFunctionPut = { allow: [reqFunctionPut] };
const permFunctionPutExe = { allow: [reqFunctionPut, reqFunctionExe] };
const permFunctionExe = { allow: [reqFunctionExe] };
const permFunctionGetExe = { allow: [reqFunctionGet, reqFunctionExe] };

const permFunctionPutLimited = (perm: string, acc: IAccount, boundaryId: string) => ({
  allow: [
    { action: perm, resource: `/account/${acc.accountId}/subscription/${acc.subscriptionId}/boundary/${boundaryId}/` },
  ],
});

const permFunctionPutLimitedHigher = (perm: string, acc: IAccount) => ({
  allow: [{ action: perm, resource: `/account/${acc.accountId}/` }],
});

describe('function.exec', () => {
  test('attempt to run a function', async () => {
    const profile = await FusebitProfile.create();

    // Create some access tokens for general use
    let executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, permFunctionPutExe);
    const putExeAccessToken = executionProfile.accessToken;

    executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, permFunctionPut);
    const putAccessToken = executionProfile.accessToken;

    executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, permFunctionGetExe);
    const getExeAccessToken = executionProfile.accessToken;

    executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, permFunctionExe);
    const exeAccessToken = executionProfile.accessToken;

    // Get the master account and access token
    account = getAccount();
    const boundaryId = getBoundary();
    const allAccessToken = account.accessToken;

    // Use the downgraded PUT+EXEC token
    account.accessToken = putExeAccessToken;

    // Test: Create a function with an exec requirement using a PUT+EXEC-enabled credential
    let spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.functionPermissions = permFunctionPut;
    spec.authorizations = [reqFunctionExe];
    let response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });

    const url = response.data.location;

    // Test: Execute without an identity should result in a 403
    response = await request(url);
    httpExpect(response, { statusCode: 403 });

    // Test: Call with an identity without function:exe
    response = await callFunction(putAccessToken, url);
    httpExpect(response, { statusCode: 403 });

    // Test: Call with an identity with function:exec
    response = await callFunction(exeAccessToken, url);
    httpExpect(response, { statusCode: 200 });

    // Test: Create a function with an exe+get requirement
    account.accessToken = allAccessToken;
    spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.authorizations = [reqFunctionGet, reqFunctionExe];
    response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });

    // Test: Call with an identity with exe
    response = await callFunction(exeAccessToken, url);
    httpExpect(response, { statusCode: 403 });

    // Test: Call with an identity with exe+get
    response = await callFunction(getExeAccessToken, url);
    httpExpect(response, { statusCode: 200 });

    // Restore the old token so that things get cleaned up properly
    account.accessToken = allAccessToken;
  }, 180000);
});
