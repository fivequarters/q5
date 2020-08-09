import { request } from '@5qtrs/request';
import { FakeAccount, IAccount, resolveAccount } from './accountResolver';
import { httpExpect, setupEnvironment } from './common';
import { deleteFunction, getFunction, listFunctions, putFunction } from './sdk';

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.LOGS_DISABLE = 'true';

import { manage_tags } from '@5qtrs/function-lambda';

import { DynamoDB } from 'aws-sdk';
const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

const { getAccount, rotateBoundary, createFunction, function1Id, function2Id } = setupEnvironment();

const validateEandD = (accountId: any, e: any, d: any) => {
  expect(e).toBeNull();
  expect(d.Items).toBeDefined();
  if (!d.Items) {
    return;
  }

  // Make sure we filter out anything that doesn't match this.
  d.Items = d.Items.filter(
    (i: any) =>
      (i.category.S === manage_tags.TAG_CATEGORY_BOUNDARY || i.category.S === manage_tags.TAG_CATEGORY_SUBSCRIPTION) &&
      i.accountId.S === accountId
  );
  expect(d.Items.length).toBeDefined();
};

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

const scanForTags = async (account: any, boundaryId: string, functionId: string, expectedTags: any) => {
  // Scan, and make sure the expected tags are present.
  expect(
    await new Promise((resolve, reject) => {
      return dynamo.scan({ TableName: manage_tags.keyValueTableName }, async (e, d) => {
        if (!d.Items) {
          return resolve(null);
        }
        validateEandD(account.accountId, e, d);

        console.log(JSON.stringify(d.Items.map((i) => i.key.S)));

        const makeTagB = (t: any, v: any) =>
          [account.accountId, account.subscriptionId, boundaryId, t, v, functionId].join(manage_tags.TAG_SEP);
        const makeTagS = (t: any, v: any) =>
          [account.accountId, account.subscriptionId, t, v, boundaryId, functionId].join(manage_tags.TAG_SEP);
        const makeTag = (t: any, v: any) => [makeTagB(t, v), makeTagS(t, v)];

        let tags: string[] = [];

        for (const [k, v] of Object.entries(expectedTags)) {
          tags.push(...makeTag(k, v));
        }

        d.Items.forEach((i) => {
          expect(tags).toContain(i.key.S);
          delete tags[tags.indexOf(i.key.S as string)];
        });
        tags = tags.filter((i) => i);
        expect(tags.length).toBe(0);
        resolve();
      });
    })
  ).toBeFalsy();
};

describe('function.tags', () => {
  test('create function and validate tags exist', async () => {
    const account = getAccount();
    const boundaryId = rotateBoundary();

    // Add a response to make sure only the requested data is returned
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);

    // Scan, and make sure the expected tags are present.
    await scanForTags(account, boundaryId, function1Id, {
      ['compute.memorySize']: 128,
      ['compute.timeout']: 30,
      ['compute.runtime']: 'nodejs10.x',
      ['compute.staticIp']: false,
      ['tag.bar']: 'muh',
      ['tag.foo']: 1,
    });

    // Modify the function and specify some new pieces of metadata.
    response = await putFunction(account, boundaryId, function1Id, helloWorldUpdated);
    expect(response.status).toEqual(200);
    await scanForTags(account, boundaryId, function1Id, {
      ['compute.memorySize']: 256,
      ['compute.timeout']: 30,
      ['compute.runtime']: 'nodejs10.x',
      ['compute.staticIp']: false,
      ['tag.foo']: 5,
      ['tag.whiz']: 'bang',
    });

    // Delete the function, and make sure the expected tags are gone.
    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(204);
    await scanForTags(account, boundaryId, function1Id, {});
  }, 30000);
});
