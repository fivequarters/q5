import create_error from 'http-errors';

import { IAgent } from '@5qtrs/account-data';
import * as FunctionUtilities from '../../src/routes/functions';

import { disableFunctionUsageRestriction, callFunction } from './sdk';

import { getEnv } from './setup';
import { getParams, fakeAgent } from './function.utils';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const helloWorld = { nodejs: { files: { 'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });' } } };

const helloWorldUpdated = {
  nodejs: { files: { 'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello - Updated" });' } },
};

const ctxFunction = {
  nodejs: {
    files: { 'index.js': 'module.exports = (ctx, cb) => cb(null, { body: { ...ctx, configuration: undefined } });' },
  },
};

describe('Function Utilities', () => {
  test('Create simple function', async () => {
    const params = getParams(function1Id, account, boundaryId);
    const res = await FunctionUtilities.createFunction(params, helloWorld, fakeAgent as IAgent);
    expect(res).toMatchObject({
      code: 200,
      status: 'success',
      subscriptionId: params.subscriptionId,
      boundaryId: params.boundaryId,
      functionId: function1Id,
      version: 1,
    });
  }, 120000);

  test('Update simple function with no change', async () => {
    disableFunctionUsageRestriction();
    const params = getParams(function1Id, account, boundaryId);
    let res = await FunctionUtilities.createFunction(params, helloWorld, fakeAgent as IAgent);
    expect(res).toMatchObject({ code: 200 });
    res = await FunctionUtilities.createFunction(params, helloWorld, fakeAgent as IAgent);
    expect(res).toMatchObject({ code: 204 });
  }, 120000);

  test('Update simple function with change', async () => {
    disableFunctionUsageRestriction();
    const params = getParams(function1Id, account, boundaryId);
    let res = await FunctionUtilities.createFunction(params, helloWorld, fakeAgent as IAgent);
    expect(res).toMatchObject({ code: 200 });
    res = await FunctionUtilities.createFunction(params, helloWorldUpdated, fakeAgent as IAgent);
    expect(res).toMatchObject({
      code: 200,
      status: 'success',
      subscriptionId: params.subscriptionId,
      boundaryId: params.boundaryId,
      functionId: function1Id,
      version: 2,
    });
  }, 120000);

  test('Create and delete a function', async () => {
    const params = getParams(function1Id, account, boundaryId);
    let res = await FunctionUtilities.createFunction(params, helloWorld, fakeAgent as IAgent);
    expect(res).toMatchObject({ code: 200 });
    res = await FunctionUtilities.deleteFunction(params);
    expect(res).toMatchObject({ code: 204 });
  }, 120000);

  test('Delete a missing function', async () => {
    const params = getParams(function1Id, account, boundaryId);
    await expect(FunctionUtilities.deleteFunction(params)).rejects.toEqual(create_error(404));
  }, 120000);

  test('Create and invoke a function', async () => {
    const params = getParams(function1Id, account, boundaryId);
    const create = await FunctionUtilities.createFunction(params, ctxFunction, fakeAgent as IAgent);
    expect(create).toMatchObject({ code: 200 });

    const exec = await FunctionUtilities.executeFunction(params, 'GET');
    const base = await callFunction('', (create.location as string) + '/');

    const bodyParam = ['accountId', 'subscriptionId', 'boundaryId', 'functionId', 'method', 'url', 'body', 'path'];
    bodyParam.forEach((p) => expect(exec.body[p]).toEqual(base.data[p]));
    expect(exec.code).toBe(base.status);
    expect(exec.body.baseUrl.length).toBeGreaterThan(10); // It's there, and long enough.
    expect(exec.body.fusebit.endpoint.length).toBeGreaterThan(10); // Ditto.

    expect(exec.body.method).toBe('GET');
  }, 120000);

  test('Invoke a function with a body payload', async () => {
    const params = getParams(function1Id, account, boundaryId);
    const create = await FunctionUtilities.createFunction(params, ctxFunction, fakeAgent as IAgent);
    expect(create).toMatchObject({ code: 200 });

    const body = { hello: 'world' };
    const exec = await FunctionUtilities.executeFunction(params, 'POST', {
      body,
      apiVersion: 'v1',
      mode: 'request',
    });
    const base = await callFunction('', create.location as string, 'POST', JSON.stringify(body));

    expect(exec.body.method).toBe('POST');
    expect(exec.body.body).toEqual(body);
    expect(base.data.body).toEqual(body);
  }, 120000);
});
