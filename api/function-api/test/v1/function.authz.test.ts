import { request } from '@5qtrs/request';
import * as Constants from '@5qtrs/constants';

import { callFunction, getFunction, putFunction } from './sdk';
import * as AuthZ from './authz';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const Permissions = Constants.Permissions;

const specFuncReturnCtx = {
  nodejs: { files: { 'index.js': 'module.exports = async (ctx) => { return { body: ctx }; };' } },
  security: {},
};

const createFunction = async (authentication: string | undefined, authorization: any[] | undefined) => {
  const spec = Constants.duplicate({}, specFuncReturnCtx);
  spec.security.authentication = authentication;
  spec.security.authorization = authorization;
  const response = await putFunction(account, boundaryId, function1Id, spec);
  expect(response).toBeHttp({ statusCode: 200 });
  return response;
};

const runTest = async (
  authentication: string | undefined,
  authorization: any[] | undefined,
  token: string,
  resultCode: number,
  resultObj: any,
  requestParams?: any
) => {
  let response = await createFunction(authentication, authorization);

  if (!requestParams) {
    response = await callFunction(token, response.data.location);
  } else {
    response = await request({
      method: 'GET',
      url: response.data.location,
      ...requestParams,
    });
  }

  expect(response).toBeHttp({ statusCode: resultCode, data: resultObj });
};

describe('Function Authz', () => {
  const endpoint = Constants.API_PUBLIC_ENDPOINT;

  test('None prevents authorization', async () => {
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.security.authentication = 'none';
    spec.security.authorization = [AuthZ.reqFunctionExe];

    const response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Authentication undefined prevents authorization', async () => {
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.security.authorization = [AuthZ.reqFunctionExe];

    const response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Authorization must not be empty when required', async () => {
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.security.authentication = 'required';
    spec.security.authorization = [];

    const response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Caller must always be present', async () => {
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.security.authentication = 'required';
    spec.security.authorization = [];

    const response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Optional | No AuthZ | Valid', async () => {
    await runTest('optional', undefined, account.accessToken, 200, {
      fusebit: { callerAccessToken: account.accessToken, endpoint },
      caller: { permissions: AuthZ.permAllWild },
    });
  }, 180000);

  test('Optional | No AuthZ | Bad', async () => {
    await runTest('optional', undefined, 'abcdefg', 200, {
      fusebit: { endpoint },
      caller: {},
    });
  }, 180000);

  test('Optional | No AuthZ | Empty', async () => {
    await runTest('optional', undefined, '', 200, {
      fusebit: { endpoint },
      caller: {},
    });
  }, 180000);

  test('Optional | AuthZ | Valid', async () => {
    await runTest('optional', [AuthZ.reqFunctionExe], account.accessToken, 200, {
      fusebit: { callerAccessToken: account.accessToken, endpoint },
      caller: { permissions: AuthZ.permAllWild },
    });
  }, 180000);

  test('Optional | AuthZ | NoPerm', async () => {
    const getAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionGet);

    await runTest('optional', [AuthZ.reqFunctionExe], getAccessToken, 403, {
      message: 'Unauthorized',
    });
  }, 180000);

  test('Optional | AuthZ | Bad', async () => {
    await runTest('optional', [AuthZ.reqFunctionExe], 'abcdefg', 200, {
      fusebit: { endpoint },
      caller: {},
    });
  }, 180000);

  test('Optional | AuthZ | Basic', async () => {
    await runTest(
      'optional',
      [AuthZ.reqFunctionExe],
      'abcdefg',
      200,
      {
        fusebit: { endpoint },
        caller: {},
      },
      {
        headers: { Authorization: `Basic foobar` },
      }
    );
  }, 180000);

  test('Optional | AuthZ | Empty', async () => {
    await runTest('optional', [AuthZ.reqFunctionExe], '', 200, {
      fusebit: { endpoint },
      caller: {},
    });
  }, 180000);

  test('Required | No AuthZ | Valid', async () => {
    await runTest('required', undefined, account.accessToken, 200, {
      fusebit: { callerAccessToken: account.accessToken, endpoint },
      caller: { permissions: AuthZ.permAllWild },
    });
  }, 180000);

  test('Required | No AuthZ | Bad', async () => {
    await runTest('required', undefined, 'abcdefg', 403, {
      message: 'Unauthorized',
    });
  }, 180000);

  test('Required | No AuthZ | Empty', async () => {
    await runTest('required', undefined, '', 403, {
      message: 'Unauthorized',
    });
  }, 180000);

  test('Required | AuthZ | Valid', async () => {
    await runTest('required', [AuthZ.reqFunctionExe], account.accessToken, 200, {
      fusebit: { callerAccessToken: account.accessToken, endpoint },
      caller: { permissions: AuthZ.permAllWild },
    });
  }, 180000);

  test('Required | AuthZ | NoPerm', async () => {
    const getAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionGet);

    await runTest('required', [AuthZ.reqFunctionExe], getAccessToken, 403, {
      message: 'Unauthorized',
    });
  }, 180000);

  test('Required | AuthZ | Bad', async () => {
    await runTest('required', [AuthZ.reqFunctionExe], 'abcdefg', 403, {
      message: 'Unauthorized',
    });
  }, 180000);

  test('Required | AuthZ | Empty', async () => {
    await runTest('required', [AuthZ.reqFunctionExe], '', 403, {
      message: 'Unauthorized',
    });
  }, 180000);
});
