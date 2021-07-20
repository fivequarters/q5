import create_error from 'http-errors';
import { IAgent } from '@5qtrs/account-data';

import * as FunctionUtilities from '../../src/routes/functions';
import { getEnv } from './setup';
import { getParams, fakeAgent, createRegistry, keyStore, subscriptionCache } from './function.utils';
import { terminate_garbage_collection } from '@5qtrs/function-lambda';
import { putFunction, waitForBuild, getFunction, disableFunctionUsageRestriction } from './sdk';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());

  // Tests here don't invoke functions, or if they do they don't care about the result, so the usage
  // restriction doesn't apply
  disableFunctionUsageRestriction();
});

FunctionUtilities.initFunctions(keyStore, subscriptionCache);

const registry = createRegistry(account, boundaryId);

const asyncFunction = {
  nodejs: {
    files: { 'index.js': 'module.exports = (ctx, cb) => cb(null, { body: { ...ctx, configuration: undefined });' },
  },
  compute: {
    staticIp: true,
  },
};

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
};

const helloWorldWithStaticIp = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  compute: {
    staticIp: true,
  },
};

const helloWorldUpdatedWithStaticIp = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello - Updated" });',
    },
  },
  compute: {
    staticIp: true,
  },
};

beforeAll(async () => {
  return keyStore.rekey();
});

afterAll(() => {
  console.log(`Shutting down keyStore`);
  keyStore.shutdown();
  terminate_garbage_collection();
});

test('Create a function that requires a build', async () => {
  const params = getParams(function1Id, account, boundaryId);
  const create = await FunctionUtilities.createFunction(params, asyncFunction, fakeAgent as IAgent, registry);
  expect(create).toMatchObject({ code: 201 });

  const build = await FunctionUtilities.waitForFunctionBuild(params, create.buildId as string, 10000);
  expect(build).toMatchObject({ code: 200, version: 1 });
}, 120000);

test('Create a function with a short timeout fails', async () => {
  const params = getParams(function1Id, account, boundaryId);
  const create = await FunctionUtilities.createFunction(params, asyncFunction, fakeAgent as IAgent, registry);
  expect(create).toMatchObject({ code: 201 });

  expect(FunctionUtilities.waitForFunctionBuild(params, create.buildId as string, 1)).rejects.toEqual(
    create_error(408)
  );
}, 120000);

test('PUT supports setting staticIP=true', async () => {
  let response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
  expect(response).toBeHttp({ statusCode: 201 });
  response = await waitForBuild(account, response.data, 120, 1000);
  expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
  response = await getFunction(account, boundaryId, function1Id);
  expect(response.status).toBe(200);
  expect(response.data.compute).toEqual({ staticIp: true, memorySize: 128, timeout: 30 });
}, 240000);

test('PUT multiple times on the same function', async () => {
  let response = await putFunction(account, boundaryId, function1Id, helloWorld);
  expect(response).toBeHttp({ statusCode: 200 });

  response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
  expect(response).toBeHttp({ statusCode: 201 });

  // Instead of waiting for the function to complete it's build, try again and see what happens.
  response = await putFunction(account, boundaryId, function1Id, helloWorld);
  expect(response).toBeHttp({ statusCode: 204 }); // Lies, but unsurprising if not waiting for the build to complete.

  response = await putFunction(account, boundaryId, function1Id, helloWorldUpdatedWithStaticIp);
  expect(response).toBeHttp({ statusCode: 201 });
}, 120000);

test('PUT with new compute values updates compute', async () => {
  let response = await putFunction(account, boundaryId, function1Id, helloWorld);
  expect(response).toBeHttp({ statusCode: 200 });

  response = await getFunction(account, boundaryId, function1Id);
  expect(response).toBeHttp({ statusCode: 200 });

  const data = response.data;
  expect(data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });

  data.compute.staticIp = true;
  response = await putFunction(account, boundaryId, function1Id, data);
  expect(response).toBeHttp({ statusCode: 201 });
  response = await waitForBuild(account, response.data, 120, 1000);
  expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

  response = await getFunction(account, boundaryId, function1Id);
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
}, 240000);

test('PUT with new compute values and code executes async', async () => {
  let response = await putFunction(account, boundaryId, function1Id, helloWorld);
  expect(response).toBeHttp({ statusCode: 200 });

  response = await getFunction(account, boundaryId, function1Id);
  expect(response).toBeHttp({ statusCode: 200 });

  const data = response.data;
  expect(data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });

  response = await putFunction(account, boundaryId, function1Id, helloWorldUpdatedWithStaticIp);
  expect(response).toBeHttp({ statusCode: 201 });
  response = await waitForBuild(account, response.data, 120, 1000);
  expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

  response = await getFunction(account, boundaryId, function1Id);
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
}, 240000);

test('PUT with undefined compute is ignored', async () => {
  let response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
  response = await waitForBuild(account, response.data, 120, 1000);
  expect(response).toBeHttp({ statusCode: 200, status: 'success' });

  response = await getFunction(account, boundaryId, function1Id, true);

  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
  expect(response.data.computeSerialized).toBe('staticIp=true\nmemorySize=128\ntimeout=30');

  response.data.compute = undefined;
  response = await putFunction(account, boundaryId, function1Id, response.data);
  expect(response.status).toBe(204);
}, 240000);

test('PUT with new compute values updates compute and computeSerialized', async () => {
  let response = await putFunction(account, boundaryId, function1Id, helloWorld);
  expect(response).toBeHttp({ statusCode: 200 });

  response = await getFunction(account, boundaryId, function1Id, true);
  expect(response).toBeHttp({ statusCode: 200 });

  const data = response.data;
  expect(data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
  expect(data.computeSerialized).toBe('memorySize=128\ntimeout=30\nstaticIp=false');

  data.compute.staticIp = true;
  response = await putFunction(account, boundaryId, function1Id, data);
  expect(response).toBeHttp({ statusCode: 201 });
  response = await waitForBuild(account, response.data, 120, 1000);
  expect(response).toBeHttp({ statusCode: 200 });

  response = await getFunction(account, boundaryId, function1Id, true);
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
  expect(response.data.computeSerialized).toBe('memorySize=128\ntimeout=30\nstaticIp=true');
}, 240000);
