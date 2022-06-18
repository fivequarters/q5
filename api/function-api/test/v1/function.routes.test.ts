import { request } from '@5qtrs/request';
import * as Constants from '@5qtrs/constants';

import { callFunction, getFunction, putFunction } from './sdk';
import * as AuthZ from './authz';

import { getEnv } from './setup';

let { account, boundaryId, function1Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id } = getEnv());
});

const specFuncReturnCtx = {
  nodejs: { files: { 'index.js': 'module.exports = async (ctx) => { return { body: ctx }; };' } },
  security: {},
};

const createFunction = async (
  authentication: string | undefined,
  authorization: any[] | undefined,
  routes: any | undefined
) => {
  const spec = Constants.duplicate({}, specFuncReturnCtx);
  spec.security.authentication = authentication;
  spec.security.authorization = authorization;
  spec.routes = routes;
  const response = await putFunction(account, boundaryId, function1Id, spec);
  expect(response).toBeHttp({ statusCode: 200 });
  return response;
};

const runTest = async (
  authentication: string | undefined,
  authorization: any[] | undefined,
  routes: any | undefined,
  path: string,
  token: string,
  resultCode: number,
  resultObj: any,
  requestParams?: any
) => {
  let response = await createFunction(authentication, authorization, routes);

  if (!requestParams) {
    response = await callFunction(token, response.data.location + path);
  } else {
    response = await request({
      method: 'GET',
      url: response.data.location,
      ...requestParams,
    });
  }

  expect(response).toBeHttp({ statusCode: resultCode, data: resultObj });
};

describe('Function Routes', () => {
  const endpoint = Constants.API_PUBLIC_ENDPOINT;

  test('Creating a function with route without the path fails', async () => {
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.routes = [{}];

    const response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Creating a function with routes that is not an array fails', async () => {
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.routes = 'foo';

    const response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Creating a function with routes creates the routes tag', async () => {
    const spec = Constants.duplicate({}, specFuncReturnCtx);
    spec.routes = [
      {
        path: '/foo',
      },
      {
        path: '/bar',
      },
    ];

    let response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200, data: { runtime: { tags: {} } } });
    expect(typeof response.data.runtime.tags.routes).toEqual('string');
    const r = JSON.parse(response.data.runtime.tags.routes);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(2);
    expect(r[0].path).toBe('/foo');
    expect(r[1].path).toBe('/bar');
  }, 180000);

  test('Route security takes precedence over function security, 200', async () => {
    await runTest(
      'none',
      undefined,
      [
        {
          path: '/foo',
          security: {
            authentication: 'required',
            authorization: [AuthZ.reqFunctionExe],
          },
        },
      ],
      '/foo',
      account.accessToken,
      200,
      {
        fusebit: { callerAccessToken: account.accessToken, endpoint },
        caller: { permissions: AuthZ.permAllWild },
      }
    );
  }, 180000);

  test('Route security takes precedence over function security, 403', async () => {
    await runTest(
      'none',
      undefined,
      [
        {
          path: '/foo',
          security: {
            authentication: 'required',
            authorization: [AuthZ.reqFunctionExe],
          },
        },
      ],
      '/foo',
      'badAccessToken',
      403,
      {}
    );
  }, 180000);

  test('First prefix-matching route wins', async () => {
    await runTest(
      'none',
      undefined,
      [
        {
          path: '/foo',
          security: {
            authentication: 'required',
            authorization: [AuthZ.reqFunctionExe],
          },
        },
        {
          path: '/foo/bar',
          security: {
            authentication: 'none',
          },
        },
      ],
      '/foo',
      'badAccessToken',
      403,
      {}
    );
  }, 180000);

  test('Route prefix-matching is segment-delimited, variant 1', async () => {
    await runTest(
      'none',
      undefined,
      [
        {
          path: '/foo',
          security: {
            authentication: 'none',
          },
        },
        {
          path: '/foorious',
          security: {
            authentication: 'required',
            authorization: [AuthZ.reqFunctionExe],
          },
        },
      ],
      '/foo/bar',
      'badAccessToken',
      200,
      {}
    );
  }, 180000);

  test('Route prefix-matching is segment-delimited, variant 2', async () => {
    await runTest(
      'none',
      undefined,
      [
        {
          path: '/foo',
          security: {
            authentication: 'none',
          },
        },
        {
          path: '/foorious',
          security: {
            authentication: 'required',
            authorization: [AuthZ.reqFunctionExe],
          },
        },
      ],
      '/foor',
      'badAccessToken',
      200,
      {}
    );
  }, 180000);

  test('Route prefix-matching is segment-delimited, variant 3', async () => {
    await runTest(
      'none',
      undefined,
      [
        {
          path: '/foo',
          security: {
            authentication: 'none',
          },
        },
        {
          path: '/foorious',
          security: {
            authentication: 'required',
            authorization: [AuthZ.reqFunctionExe],
          },
        },
      ],
      '/foorious',
      account.accessToken,
      200,
      {
        fusebit: { callerAccessToken: account.accessToken, endpoint },
        caller: { permissions: AuthZ.permAllWild },
      }
    );
  }, 180000);
});
