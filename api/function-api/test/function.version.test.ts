import { DynamoDB } from 'aws-sdk';

import * as Constants from '@5qtrs/constants';

import { getFunction, putFunction, callFunction, disableFunctionUsageRestriction } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

export const keyValueTableName = Constants.get_key_value_table_name(process.env.DEPLOYMENT_KEY as string);

const makeFunction = (version: number) => {
  return {
    nodejs: { files: { 'index.js': `module.exports = (ctx, cb) => cb(null, { body: "${version}" });` } },
  };
};

const makeConfigFunction = (version: number) => {
  return {
    nodejs: { files: { 'index.js': 'module.exports = (ctx, cb) => cb(null, { body: ctx.configuration.TEST });' } },
    configuration: { TEST: `${version}` },
  };
};

const demoteFunction = async (targetVersion?: number) => {
  const functionKey = `${account.accountId}/${account.subscriptionId}/${boundaryId}/${function1Id}`;

  const params: DynamoDB.UpdateItemInput = {
    TableName: keyValueTableName,
    ExpressionAttributeNames: { '#FV': 'environment.function' },
    Key: {
      category: { S: 'function-tags-function' },
      key: { S: functionKey },
    },
    UpdateExpression: 'SET #FV = :ver',
  };

  if (targetVersion !== undefined) {
    params.ExpressionAttributeValues = { ':ver': { N: `${targetVersion}` } };
    params.UpdateExpression = 'SET #FV = :ver';
  } else {
    params.UpdateExpression = 'REMOVE #FV';
  }

  // Demote the version in the database, to force an older version to get called.
  await dynamo.updateItem(params).promise();
};

describe('Function Version', () => {
  test('metadata version increases with each call', async () => {
    disableFunctionUsageRestriction();

    // Validate the version tag is increased as expected
    for (let i = 1; i < 4; i++) {
      let response = await putFunction(account, boundaryId, function1Id, makeFunction(i));
      expect(response).toBeHttp({ statusCode: 200 });
      const location = response.data.location;
      response = await getFunction(account, boundaryId, function1Id);
      expect(response.data.runtime.tags['environment.function']).toBe(i);
      response = await callFunction('', location);
      expect(response.data).toBe(i);
    }
  }, 120000);

  test('metadata determines the function call', async () => {
    disableFunctionUsageRestriction();

    // Bump the function a few times
    let response = await putFunction(account, boundaryId, function1Id, makeFunction(1));
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function1Id, makeFunction(2));
    expect(response).toBeHttp({ statusCode: 200 });
    const location = response.data.location;

    response = await callFunction('', location);
    expect(response.data).toBe(2);

    // Validate that the expected function gets executed
    await demoteFunction(1);
    response = await callFunction('', location);
    expect(response.data).toBe(1);
  }, 120000);

  test('missing metadata executes $LATEST', async () => {
    disableFunctionUsageRestriction();

    // Bump the function a few times
    let response = await putFunction(account, boundaryId, function1Id, makeFunction(1));
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function1Id, makeFunction(2));
    expect(response).toBeHttp({ statusCode: 200 });
    const location = response.data.location;

    response = await callFunction('', location);
    expect(response.data).toBe(2);

    // Validate that the expected function gets executed
    await demoteFunction(1);
    response = await callFunction('', location);
    expect(response.data).toBe(1);

    // Now remove the entry and validate it running $LATEST
    await demoteFunction(undefined);
    response = await callFunction('', location);
    expect(response.data).toBe(2);
  }, 120000);

  test('old function versions removed', async () => {
    disableFunctionUsageRestriction();

    // Bump the function a few times
    let response = await putFunction(account, boundaryId, function1Id, makeFunction(1));
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function1Id, makeFunction(2));
    expect(response).toBeHttp({ statusCode: 200 });
    const location = response.data.location;

    response = await callFunction('', location);
    expect(response.data).toBe(2);

    // Demote and validate that the expected function gets executed
    await demoteFunction(1);
    response = await callFunction('', location);
    expect(response.data).toBe(1);

    // Wait for 5:05 minutes for the timer to fire.
    await new Promise((resolve, reject) => setTimeout(resolve, 5 * 60 * 1000 + 5000));
    response = await callFunction('', location);
    expect(response).toBeHttp({ statusCode: 404 });
  }, 500000);

  test('configuration changes get persisted', async () => {
    disableFunctionUsageRestriction();

    // Validate the version tag is increased as expected
    for (let i = 1; i < 4; i++) {
      let response = await putFunction(account, boundaryId, function1Id, makeConfigFunction(i));
      expect(response).toBeHttp({ statusCode: 200 });
      const location = response.data.location;
      response = await getFunction(account, boundaryId, function1Id);
      expect(response.data.runtime.tags['environment.function']).toBe(i);
      response = await callFunction('', location);
      expect(response.data).toBe(i);
    }
  }, 120000);
});
