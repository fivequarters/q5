import create_error from 'http-errors';
import { IAgent } from '@5qtrs/account-data';

import * as FunctionUtilities from '../../src/routes/functions';
import { getEnv } from './setup';
import { getParams, fakeAgent, createRegistry, keyStore, subscriptionCache } from './function.utils';
import { terminate_garbage_collection } from '@5qtrs/function-lambda';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
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
  expect(create).toMatchObject({ code: 200 });

  const build = await FunctionUtilities.waitForFunctionBuild(params, create.buildId as string, 10000);
  expect(build).toMatchObject({ code: 200, version: 1 });
}, 120000);

test('Create a function with a short timeout fails', async () => {
  const params = getParams(function1Id, account, boundaryId);
  const create = await FunctionUtilities.createFunction(params, asyncFunction, fakeAgent as IAgent, registry);
  expect(create).toMatchObject({ code: 200 });

  expect(FunctionUtilities.waitForFunctionBuild(params, create.buildId as string, 1)).rejects.toEqual(
    create_error(408)
  );
}, 120000);
