import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';

import { decodeJwt } from '@5qtrs/jwt';

import * as Constants from '@5qtrs/constants';

import * as AuthZ from './authorizations';
import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

import { FakeAccount, IAccount, resolveAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import { callFunction, getFunction, putFunction } from './sdk';

let account: IAccount = FakeAccount;
const { getAccount, getBoundary } = setupEnvironment();
const function1Id = 'test-fun-exec-1';

const specFuncReturnCtx = {
  authentication: 'required',
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx.fusebit }; };',
    },
  },
};

describe('function.exec', () => {
  test('simple authorization requirements', async () => {
    const profile = await FusebitProfile.create();

    // Create some access tokens for general use
    const putExeAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionPutExe);
    const putAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionPut);
    const getExeAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionGetExe);
    const exeAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionExe);

    // Get the master account and access token
    account = getAccount();
    const boundaryId = getBoundary();
    const allAccessToken = account.accessToken;

    // Test: Create a function with an exec requirement using a PUT-enabled credential
    account.accessToken = putAccessToken;
    let spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.functionPermissions = AuthZ.permFunctionPut;
    spec.authorizations = [AuthZ.reqFunctionExe];
    let response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });

    const url = response.data.location;

    // Test: Execute without an identity should result in a 403
    response = await request(url);
    httpExpect(response, { statusCode: 403 });

    // Test: Call with an identity without function:exe
    response = await callFunction(putAccessToken, url);
    httpExpect(response, { statusCode: 403 });

    // Test: Call with an identity with function:exe
    response = await callFunction(exeAccessToken, url);
    httpExpect(response, { statusCode: 200 });

    // Test: Create a function with an exe+get requirement
    account.accessToken = putAccessToken;
    spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.authorizations = [AuthZ.reqFunctionGet, AuthZ.reqFunctionExe];
    response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 200 });

    // Test: Call with an identity with exe
    response = await callFunction(exeAccessToken, url);
    httpExpect(response, { statusCode: 403 });

    // Test: Call with an identity with get+get
    response = await callFunction(getExeAccessToken, url);
    httpExpect(response, { statusCode: 200 });

    // Restore the old token so that things get cleaned up properly
    account.accessToken = allAccessToken;
  }, 180000);
});
