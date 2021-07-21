import { DynamoDB } from 'aws-sdk';
import create_error from 'http-errors';
import * as superagent from 'superagent';
import { IAgent, ISubscription } from '@5qtrs/account-data';
import * as Constants from '@5qtrs/constants';

import * as FunctionUtilities from '../../src/routes/functions';
import { getEnv } from './setup';
import { getParams, fakeAgent, createRegistry, keyStore, subscriptionCache } from './function.utils';
import { terminate_garbage_collection } from '@5qtrs/function-lambda';
import { putFunction, waitForBuild, getFunction, disableFunctionUsageRestriction } from './sdk';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();

FunctionUtilities.initFunctions(keyStore, subscriptionCache);

const registry = createRegistry(account, boundaryId);

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });
const subscriptionTableName = Constants.get_subscription_table_name(process.env.DEPLOYMENT_KEY as string);

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

describe('Subscription with staticIp=true', () => {
  beforeAll(async () => {
    ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
  });

  beforeEach(async () => {
    ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());

    // Tests here don't invoke the functions, so usage restrictions don't apply.
    disableFunctionUsageRestriction();

    const subscription = (await subscriptionCache.find(account.subscriptionId)) as ISubscription;
    await setSubscriptionStaticIpFlag(subscription, true);
  });

  test('Create a function that requires a build', async () => {
    const params = getParams(function1Id, account, boundaryId);
    const create = await FunctionUtilities.createFunction(params, asyncFunction, fakeAgent as IAgent, registry);
    expect(create).toMatchObject({ code: 201 });

    const build = await FunctionUtilities.waitForFunctionBuild(params, create.buildId as string, 120000);
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
});

describe('Subscription with staticIp=false', () => {
  beforeEach(async () => {
    ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());

    // Tests here don't invoke the functions, so usage restrictions don't apply.
    disableFunctionUsageRestriction();

    const subscription = (await subscriptionCache.find(account.subscriptionId)) as ISubscription;

    await setSubscriptionStaticIpFlag(subscription, false);
  });

  test('Static IP should be false if flag on subscription is false', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('staticIp=false\nmemorySize=128\ntimeout=30');
  }, 120000);
});

async function setSubscriptionStaticIpFlag(subscription: ISubscription, staticIp: boolean) {
  const flags = subscription.flags || {};
  flags.staticIp = staticIp;

  const params: DynamoDB.UpdateItemInput = {
    TableName: subscriptionTableName,
    Key: {
      accountId: { S: account.accountId },
      subscriptionId: { S: account.subscriptionId },
    },
    UpdateExpression: 'SET flags = :flags',
    ExpressionAttributeValues: {
      ':flags': { S: JSON.stringify(flags) },
    },
  };
  await dynamo.updateItem(params).promise();

  const refreshUrl = `${account.baseUrl}/v1/refresh`;
  await superagent.get(refreshUrl);
  subscriptionCache.refresh();
}
