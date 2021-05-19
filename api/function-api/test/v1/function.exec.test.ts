import { request } from '@5qtrs/request';
import * as Constants from '@5qtrs/constants';
import { FusebitProfile } from '@5qtrs/fusebit-profile-sdk';

import * as AuthZ from './authz';
import { callFunction, getFunction, putFunction } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const specFuncReturnCtx = {
  security: { authentication: 'required' },
  nodejs: {
    files: {
      'index.js': 'module.exports = async (ctx) => { return { body: ctx.fusebit }; };',
    },
  },
};

describe('Function Exec', () => {
  test('simple authorization requirements', async () => {
    const profile = await FusebitProfile.create();

    // Create some access tokens for general use
    const putExeAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionPutExe);
    const putAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionPut);
    const exeAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionExe);

    // Test: Create a function with an exec requirement using a PUT-enabled credential
    account.accessToken = putAccessToken;
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.security.functionPermissions = AuthZ.permFunctionPut;
    spec.security.authorization = [AuthZ.reqFunctionExe];
    let response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 200 });

    const url = response.data.location;

    // Test: Execute without an identity should result in a 403
    response = await request(url);
    expect(response).toBeHttp({ statusCode: 403 });

    // Test: Call with an identity without function:exe
    response = await callFunction(putAccessToken, url);
    expect(response).toBeHttp({ statusCode: 403 });

    // Test: Call with an identity with function:exe
    response = await callFunction(exeAccessToken, url);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('create a function with an exe+get requirement', async () => {
    const putAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionPut);
    const exeAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionExe);
    const getExeAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionGetExe);

    account.accessToken = putAccessToken;
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.security.authorization = [AuthZ.reqFunctionGet, AuthZ.reqFunctionExe];
    let response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 200 });

    const url = response.data.location;

    // Test: Call with an identity with exe
    response = await callFunction(exeAccessToken, url);
    expect(response).toBeHttp({ statusCode: 403 });

    // Test: Call with an identity with get+get
    response = await callFunction(getExeAccessToken, url);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);
});
