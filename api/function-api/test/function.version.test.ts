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

const demoteFunction = async (targetVersion: number) => {
  const functionKey = `${account.accountId}/${account.subscriptionId}/${boundaryId}/${function1Id}`;

  // Demote the version in the database, to force an older version to get called.
  await dynamo
    .updateItem({
      TableName: keyValueTableName,
      ExpressionAttributeNames: { '#FV': 'environment.function' },
      ExpressionAttributeValues: { ':ver': { N: `${targetVersion}` } },
      Key: {
        category: { S: 'function-tags-function' },
        key: { S: functionKey },
      },
      UpdateExpression: 'SET #FV = :ver',
    })
    .promise();
};

describe('function.versions', () => {
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
});
