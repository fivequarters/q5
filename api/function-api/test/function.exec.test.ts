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

const reqFunctionBase = [];
const reqFunctionGet = { action: Permissions.getFunction, resource: '/' };
const permFunctionWildcard = { allow: [{ action: Permissions.allFunction, resource: '/' }] };
const permFunctionPut = {
  require: [],
  allow: [{ action: Permissions.putFunction, resource: '/' }],
};
const permFunctionExecute = { allow: [{ action: Permissions.exeFunction, resource: '/' }] };
const permFunctionGetExecute = {
  allow: [
    { action: Permissions.getFunction, resource: '/' },
    { action: Permissions.exeFunction, resource: '/' },
  ],
};

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
    let executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, permFunctionPut);

    // Put a function using the put-only token
    account = getAccount();
    const boundaryId = getBoundary();
    const oldToken = account.accessToken;

    // Use the downgraded token
    account.accessToken = executionProfile.accessToken;

    // Create a function with an exec requirement using a PUT-enabled credential
    let spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.permissions = permFunctionPut;
    let response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });

    const url = response.data.location;

    // Call without an identity should result in a 403
    response = await request(url);
    httpExpect(response, { statusCode: 403 });

    // Call with an identity without function:exec
    response = await callFunction(account.accessToken, url);
    httpExpect(response, { statusCode: 403 });

    // Call with an identity with function:exec
    executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, permFunctionExecute);
    response = await callFunction(executionProfile.accessToken, url);
    httpExpect(response, { statusCode: 200 });

    // Create a function with an exec AND get requirement
    account.accessToken = oldToken;
    spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.permissions = Constants.duplicate({}, permFunctionPut);
    spec.permissions.require.push(reqFunctionGet);
    response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });

    // Call with an identity with function:exec
    response = await callFunction(executionProfile.accessToken, url);
    httpExpect(response, { statusCode: 403 });

    // Call with an identity with function:exec and function:get
    executionProfile = await profile.getPKIExecutionProfile(process.env.FUSE_PROFILE, true, permFunctionGetExecute);
    response = await callFunction(executionProfile.accessToken, url);
    httpExpect(response, { statusCode: 200 });

    // Restore the old token.
    account.accessToken = oldToken;
  }, 180000);
});
