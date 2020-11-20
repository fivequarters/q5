import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';

import { decodeJwt } from '@5qtrs/jwt';

import * as Constants from '@5qtrs/constants';
const Permissions = Constants.Permissions;

import { IAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import { callFunction, getFunction, putFunction } from './sdk';

import * as AuthZ from './authz';

const { getAccount, getBoundary } = setupEnvironment();
const function1Id = 'test-fun-authz-1';

const specFuncReturnCtx = {
  nodejs: { files: { 'index.js': 'module.exports = async (ctx) => { return { body: ctx }; };' } },
};

const createFunction = async (
  account: IAccount,
  boundaryId: string,
  authentication: string | undefined,
  authorization: any[] | undefined
) => {
  const spec = Constants.duplicate({}, specFuncReturnCtx);
  spec.authentication = authentication;
  spec.authorization = authorization;
  const response = await putFunction(account, boundaryId, function1Id, spec);
  httpExpect(response, { statusCode: 200 });
  return response;
};

const runTest = async (
  account: IAccount,
  authentication: string | undefined,
  authorization: any[] | undefined,
  token: string,
  resultCode: number,
  resultObj: any
) => {
  const boundaryId = getBoundary();

  let response = await createFunction(account, boundaryId, authentication, authorization);

  response = await callFunction(token, response.data.location);
  httpExpect(response, { statusCode: resultCode });

  expect(response.data).toMatchObject(resultObj);
};

describe('function authorization', () => {
  test('None prevents authorization', async () => {
    const account = getAccount();
    const boundaryId = getBoundary();

    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.authentication = 'none';
    spec.authorization = [AuthZ.reqFunctionExe];

    const response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 400 });
  }, 180000);

  test('Authentication undefined prevents authorization', async () => {
    const account = getAccount();
    const boundaryId = getBoundary();

    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.authorization = [AuthZ.reqFunctionExe];

    const response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 400 });
  }, 180000);

  test('Authorizations must not be empty when required', async () => {
    const account = getAccount();
    const boundaryId = getBoundary();

    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.authentication = 'required';
    spec.authorization = [];

    const response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 400 });
  }, 180000);

  test('Caller must always be present', async () => {
    const account = getAccount();
    const boundaryId = getBoundary();

    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.authentication = 'required';
    spec.authorization = [];

    const response = await putFunction(account, boundaryId, function1Id, spec);
    httpExpect(response, { statusCode: 400 });
  }, 180000);

  test('Optional | No AuthZ | Valid', async () => {
    const account = getAccount();

    await runTest(account, 'optional', undefined, account.accessToken, 200, {
      fusebit: { callerAccessToken: account.accessToken },
      caller: { permissions: AuthZ.permAllWild },
    });
  }, 180000);

  test('Optional | No AuthZ | Bad', async () => {
    const account = getAccount();

    await runTest(account, 'optional', undefined, 'abcdefg', 200, {
      fusebit: {},
      caller: {},
    });
  }, 180000);

  test('Optional | No AuthZ | Empty', async () => {
    const account = getAccount();

    await runTest(account, 'optional', undefined, '', 200, {
      fusebit: {},
      caller: {},
    });
  }, 180000);

  test('Optional | AuthZ | Valid', async () => {
    const account = getAccount();

    await runTest(account, 'optional', [AuthZ.reqFunctionExe], account.accessToken, 200, {
      fusebit: { callerAccessToken: account.accessToken },
      caller: { permissions: AuthZ.permAllWild },
    });
  }, 180000);

  test('Optional | AuthZ | NoPerm', async () => {
    const account = getAccount();
    const getAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionGet);

    await runTest(account, 'optional', [AuthZ.reqFunctionExe], getAccessToken, 403, {
      message: 'Unauthorized',
    });
  }, 180000);

  test('Optional | AuthZ | Bad', async () => {
    const account = getAccount();

    await runTest(account, 'optional', [AuthZ.reqFunctionExe], 'abcdefg', 200, {
      fusebit: {},
      caller: {},
    });
  }, 180000);

  test('Optional | AuthZ | Empty', async () => {
    const account = getAccount();

    await runTest(account, 'optional', [AuthZ.reqFunctionExe], '', 200, {
      fusebit: {},
      caller: {},
    });
  }, 180000);

  test('Required | No AuthZ | Valid', async () => {
    const account = getAccount();

    await runTest(account, 'required', undefined, account.accessToken, 200, {
      fusebit: { callerAccessToken: account.accessToken },
      caller: { permissions: AuthZ.permAllWild },
    });
  }, 180000);

  test('Required | No AuthZ | Bad', async () => {
    const account = getAccount();

    await runTest(account, 'required', undefined, 'abcdefg', 403, {
      message: 'Unauthorized',
    });
  }, 180000);

  test('Required | No AuthZ | Empty', async () => {
    const account = getAccount();

    await runTest(account, 'required', undefined, '', 403, {
      message: 'Unauthorized',
    });
  }, 180000);

  test('Required | AuthZ | Valid', async () => {
    const account = getAccount();

    await runTest(account, 'required', [AuthZ.reqFunctionExe], account.accessToken, 200, {
      fusebit: { callerAccessToken: account.accessToken },
      caller: { permissions: AuthZ.permAllWild },
    });
  }, 180000);

  test('Required | AuthZ | NoPerm', async () => {
    const account = getAccount();
    const getAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionGet);

    await runTest(account, 'required', [AuthZ.reqFunctionExe], getAccessToken, 403, {
      message: 'Unauthorized',
    });
  }, 180000);

  test('Required | AuthZ | Bad', async () => {
    const account = getAccount();

    await runTest(account, 'required', [AuthZ.reqFunctionExe], 'abcdefg', 403, {
      message: 'Unauthorized',
    });
  }, 180000);

  test('Required | AuthZ | Empty', async () => {
    const account = getAccount();

    await runTest(account, 'required', [AuthZ.reqFunctionExe], '', 403, {
      message: 'Unauthorized',
    });
  }, 180000);
});
