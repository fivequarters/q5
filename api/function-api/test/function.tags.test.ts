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

const {
  getAccount,
  rotateBoundary,
  function1Id,
  function2Id,
  function3Id,
  function4Id,
  function5Id,
} = setupEnvironment();

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  metadata: { tags: { common: 3, foo: 1, bar: 'muh', flies: null } },
};

const helloWorldUpdated = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello - Updated" });',
    },
  },
  compute: { memorySize: 256 },
  metadata: { tags: { 'eq=key': 'found', eqval: 'fou=nd', common: 3, foo: 5, whiz: 'bang' } },
};

const helloWorldWithCron = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  schedule: {
    cron: '0 0 1 1 *', // at midnight on January 1st
    timezone: 'UTC',
  },
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
          ['tag.common']: 3,
          ['tag.foo']: 1,
          ['tag.bar']: 'muh',
          ['tag.flies']: null,
          ['cron']: false,
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
          ['tag.common']: 3,
          ['tag.foo']: 5,
          ['tag.whiz']: 'bang',
          ['tag.eq=key']: 'found',
          ['tag.eqval']: 'fou=nd',
          ['cron']: false,
        },
      ],
    ]);

    // Delete the function, and make sure the expected tags are gone.
    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(204);
    await scanForTags([[options, {}]]);
  }, 120000);

  test('create functions and search', async () => {
    const account = getAccount();
    const boundaryId = rotateBoundary();

    const options = {
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
    };

    // Create a couple functions to search for
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function2Id, helloWorldUpdated);
    expect(response.status).toEqual(200);

    const search = async (k: string, v: any, expected: any) => {
      let results: any;
      expect(
        await new Promise((resolve, reject) => {
          manage_tags.search_function_tags(options, k, v, undefined, undefined, (e: any, r: any, n: any) => {
            results = r;
            resolve(e);
          });
        })
      ).toBeFalsy();
      expect(results).toBeDefined();
      expect(results).toHaveLength(expected.length);
      if (results) {
        results.forEach((e: any) => expect(expected).toContain(e.functionId));
      }
    };

    search(manage_tags.get_metadata_tag_key('common'), 3, [function1Id, function2Id]);
    search(manage_tags.get_metadata_tag_key('foo'), 1, [function1Id]);
    search(manage_tags.get_metadata_tag_key('foo'), 5, [function2Id]);
    search(manage_tags.get_metadata_tag_key('whiz'), 'bang', [function2Id]);
    search(manage_tags.get_metadata_tag_key('whiz'), undefined, [function2Id]);
    search(manage_tags.get_metadata_tag_key('flies'), null, [function1Id]);
    search(manage_tags.get_metadata_tag_key('flies'), 'null', [function1Id]); // Probably shouldn't be true, but...
    search(manage_tags.get_compute_tag_key('memorySize'), 256, [function2Id]);
    search(manage_tags.get_metadata_tag_key('eq=key'), undefined, [function2Id]);
    search(manage_tags.get_metadata_tag_key('eq=key'), 'found', [function2Id]);
    search(manage_tags.get_metadata_tag_key('eqval'), undefined, [function2Id]);
    search(manage_tags.get_metadata_tag_key('eqval'), 'fou=nd', [function2Id]);
    search('cron', false, [function1Id, function2Id]);
    search('cron', undefined, [function1Id, function2Id]);
  }, 120000);

  test('paginated search', async () => {
    const account = getAccount();
    const boundaryId = rotateBoundary();

    const options = {
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
    };

    // Create a couple functions to search for
    let response: any;
    response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function2Id, helloWorldUpdated);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function3Id, helloWorld);
    expect(response.status).toEqual(200);

    const search = async (k: string, v: any, next: any, limit: any) => {
      let results: any;
      expect(
        await new Promise((resolve, reject) => {
          manage_tags.search_function_tags(options, k, v, next, limit, (e: any, r: any, n: any) => {
            results = [r, n];
            resolve(e);
          });
        })
      ).toBeFalsy();
      expect(results).toBeDefined();
      return results;
    };

    let result: any;
    const found: any = [];
    result = await search(manage_tags.get_metadata_tag_key('common'), 3, undefined, 2);
    expect(result[0]).toHaveLength(2);
    found.push(...result[0]);
    result = await search(manage_tags.get_metadata_tag_key('common'), 3, result[1], 2);
    expect(result[0]).toHaveLength(1);
    found.push(...result[0]);

    expect(found).toHaveLength(3);
    let expected = [
      { boundaryId, functionId: function1Id },
      { boundaryId, functionId: function2Id },
      { boundaryId, functionId: function3Id },
    ];
    found.forEach((f: any) => {
      expected = expected.filter((e: any) => e.boundaryId !== f.boundaryId && e.functionId !== f.functionId);
    });
    expect(expected).toHaveLength(0);
  }, 120000);

  test('listFunctions', async () => {
    const account = getAccount();
    const boundaryId = rotateBoundary();

    const options = {
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
    };

    // Create a couple functions to search for
    let response: any;
    let result: any;
    response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function2Id, helloWorldUpdated);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function3Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function4Id, helloWorldWithCron);
    expect(response.status).toEqual(200);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.common=3', undefined);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(3);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.flies', undefined);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(2);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.whiz=bang', undefined);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(1);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.eq%3Dkey=found', undefined);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(1);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.eq%3Dkey', undefined);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(1);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.eqval=fou%3Dnd', undefined);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(1);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.eqval', undefined);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(1);

    result = [];
    response = await listFunctions(account, boundaryId, undefined, 2, 'cron', undefined);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(2);
    expect(response.data.next).toBeTruthy();
    result.push(...response.data.items);

    response = await listFunctions(account, boundaryId, undefined, 2, 'cron', response.data.next);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(2);
    result.push(...response.data.items);

    expect(result).toEqual(
      expect.arrayContaining([
        { boundaryId, functionId: function1Id, schedule: {} },
        { boundaryId, functionId: function2Id, schedule: {} },
        { boundaryId, functionId: function3Id, schedule: {} },
        { boundaryId, functionId: function4Id, schedule: helloWorldWithCron.schedule },
      ])
    );

    result = [];

    response = await listFunctions(account, boundaryId, false, 2, undefined, undefined);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(2);
    result.push(...response.data.items);

    response = await listFunctions(account, boundaryId, false, 2, undefined, response.data.next);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(1);
    result.push(...response.data.items);

    expect(result).toEqual(
      expect.arrayContaining([
        { boundaryId, functionId: function1Id, schedule: {} },
        { boundaryId, functionId: function2Id, schedule: {} },
        { boundaryId, functionId: function3Id, schedule: {} },
      ])
    );

    response = await listFunctions(account, boundaryId, true, 2, undefined, undefined);
    expect(response.status).toEqual(200);
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items[0].functionId).toBe(function4Id);
  }, 120000);
});
