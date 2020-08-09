import { request } from '@5qtrs/request';
import { FakeAccount, IAccount, resolveAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import { deleteFunction, getFunction, listFunctions, putFunction } from './sdk';

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.LOGS_DISABLE = 'true';

import { manage_tags } from '@5qtrs/function-lambda';

import { scanForTags } from './tags';

import { DynamoDB } from 'aws-sdk';
const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

const { getAccount, rotateBoundary, createFunction, function1Id, function2Id } = setupEnvironment();

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  metadata: { tags: { foo: 1, bar: 'muh' } },
};

const helloWorldUpdated = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello - Updated" });',
    },
  },
  compute: { memorySize: 256 },
  metadata: { tags: { foo: 5, whiz: 'bang' } },
};

describe('function.tags', () => {
  test('create function and validate tags exist', async () => {
    const account = getAccount();
    const boundaryId = rotateBoundary();

    const options = {
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
    };
    // Add a response to make sure only the requested data is returned
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);

    // Scan, and make sure the expected tags are present.
    await scanForTags([
      [
        options,
        {
          ['compute.memorySize']: 128,
          ['compute.timeout']: 30,
          ['compute.runtime']: 'nodejs10.x',
          ['compute.staticIp']: false,
          ['tag.bar']: 'muh',
          ['tag.foo']: 1,
        },
      ],
    ]);

    // Modify the function and specify some new pieces of metadata.
    response = await putFunction(account, boundaryId, function1Id, helloWorldUpdated);
    expect(response.status).toEqual(200);
    await scanForTags([
      [
        options,
        {
          ['compute.memorySize']: 256,
          ['compute.timeout']: 30,
          ['compute.runtime']: 'nodejs10.x',
          ['compute.staticIp']: false,
          ['tag.foo']: 5,
          ['tag.whiz']: 'bang',
        },
      ],
    ]);

    // Delete the function, and make sure the expected tags are gone.
    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(204);
    await scanForTags([[options, {}]]);
  }, 30000);
});
