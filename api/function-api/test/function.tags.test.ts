import { DynamoDB } from 'aws-sdk';

import * as Tags from '@5qtrs/function-tags';
import * as Constants from '@5qtrs/constants';

import { deleteFunction, getFunctionLocation, listFunctions, putFunction } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  metadata: { tags: { common: 3, foo: 1, bar: 'muh', flies: null } },
  runtime: { tags: { various: 'pieces', including: 'gibberish' } },
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
  test('create functions and search', async () => {
    const options = {
      req: { headers: { host: 'unused' }, protocol: 'http' },
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
      dynamo,
    };

    // Create a couple functions to search for
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorldUpdated);
    expect(response).toBeHttp({ statusCode: 200 });

    const search = async (k: string, v: any, expected: any) => {
      let results: any;
      const err = await new Promise((resolve, reject) => {
        Tags.search_function_tags(options, { [k]: v }, undefined, undefined, (e: any, r: any, n: any) => {
          results = r;
          resolve(e);
        });
      });
      expect(err).toBeFalsy();
      expect(results).toBeDefined();
      expect(results).toHaveLength(expected.length);
      if (results) {
        results.forEach((e: any) => expect(expected).toContain(e.functionId));
      }
    };

    await search(Constants.get_metadata_tag_key('common'), 3, [function1Id, function2Id]);
    await search(Constants.get_metadata_tag_key('foo'), 1, [function1Id]);
    await search(Constants.get_metadata_tag_key('foo'), 5, [function2Id]);
    await search(Constants.get_metadata_tag_key('whiz'), 'bang', [function2Id]);
    await search(Constants.get_metadata_tag_key('whiz'), undefined, [function2Id]);
    await search(Constants.get_metadata_tag_key('flies'), null, [function1Id]);
    await search(Constants.get_metadata_tag_key('flies'), 'null', [function1Id]); // Probably shouldn't be true, but...
    await search(Constants.get_compute_tag_key('memorySize'), 256, [function2Id]);
    await search(Constants.get_metadata_tag_key('eq=key'), undefined, [function2Id]);
    await search(Constants.get_metadata_tag_key('eq=key'), 'found', [function2Id]);
    await search(Constants.get_metadata_tag_key('eqval'), undefined, [function2Id]);
    await search(Constants.get_metadata_tag_key('eqval'), 'fou=nd', [function2Id]);
    await search('cron', false, [function1Id, function2Id]);
    await search('cron', undefined, [function1Id, function2Id]);
  }, 120000);

  test('paginated search', async () => {
    const options = {
      req: { headers: { host: 'unused' }, protocol: 'https' },
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
      dynamo,
    };

    // Create a couple functions to search for
    let response: any;
    response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorldUpdated);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function3Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });

    const search = async (k: string, v: any, next: any, limit: any) => {
      let results: any;
      expect(
        await new Promise((resolve, reject) => {
          Tags.search_function_tags(options, { [k]: v }, next, limit, (e: any, r: any, n: any) => {
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
    result = await search(Constants.get_metadata_tag_key('common'), 3, undefined, 2);
    expect(result[0]).toHaveLength(2);
    found.push(...result[0]);
    result = await search(Constants.get_metadata_tag_key('common'), 3, result[1], 2);
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
    const options = {
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
    };

    // Create a couple functions to search for
    let response: any;
    let result: any;
    let next: any;
    response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorldUpdated);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function3Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function4Id, helloWorldWithCron);
    expect(response).toBeHttp({ statusCode: 200 });

    result = [];
    next = undefined;
    do {
      response = await listFunctions(account, boundaryId, true, 2, undefined, next);
      expect(response).toBeHttp({ statusCode: 200 });
      result = [...result, ...response.data.items];
      next = response.data.next;
    } while (next);
    expect(result).toHaveLength(1);
    expect(result[0].functionId).toBe(function4Id);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.common=3', undefined);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(3);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.flies', undefined);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(2);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.whiz=bang', undefined);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(1);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.eq%3Dkey=found', undefined);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(1);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.eq%3Dkey', undefined);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(1);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.eqval=fou%3Dnd', undefined);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(1);

    response = await listFunctions(account, boundaryId, undefined, undefined, 'tag.eqval', undefined);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(1);

    result = [];
    next = undefined;
    do {
      response = await listFunctions(account, boundaryId, undefined, 2, 'cron', next);
      expect(response).toBeHttp({ statusCode: 200 });
      result = [...result, ...response.data.items];
      next = response.data.next;
    } while (next);

    expect(result).toEqual(
      expect.arrayContaining([
        {
          boundaryId,
          functionId: function1Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function1Id)).data.location,
        },
        {
          boundaryId,
          functionId: function2Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function2Id)).data.location,
        },
        {
          boundaryId,
          functionId: function3Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function3Id)).data.location,
        },
        {
          boundaryId,
          functionId: function4Id,
          schedule: helloWorldWithCron.schedule,
          location: (await getFunctionLocation(account, boundaryId, function4Id)).data.location,
        },
      ])
    );

    result = [];
    next = undefined;
    do {
      response = await listFunctions(account, boundaryId, false, 2, undefined, next);
      expect(response).toBeHttp({ statusCode: 200 });
      result = [...result, ...response.data.items];
      next = response.data.next;
    } while (next);

    expect(result).toEqual(
      expect.arrayContaining([
        {
          boundaryId,
          functionId: function1Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function1Id)).data.location,
        },
        {
          boundaryId,
          functionId: function2Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function2Id)).data.location,
        },
        {
          boundaryId,
          functionId: function3Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function3Id)).data.location,
        },
      ])
    );
  }, 120000);

  test('multisearch functions', async () => {
    const options = {
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
    };

    // Create a couple of functions to search for
    let response: any;
    response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorldUpdated);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function3Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });

    let search: string[];

    search = ['common=3', 'foo=1'].map((t) => Constants.get_metadata_tag_key(t));
    response = await listFunctions(account, boundaryId, undefined, undefined, search, undefined);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(2);

    search = ['common=3', 'foo=5'].map((t) => Constants.get_metadata_tag_key(t));
    response = await listFunctions(account, boundaryId, undefined, undefined, search, undefined);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items).toHaveLength(1);

    // Test the `next` handling
    let result: any[] = [];
    search = ['common=3', 'foo=1'].map((t) => Constants.get_metadata_tag_key(t));
    let next;
    do {
      response = await listFunctions(account, boundaryId, undefined, 1, search, next);
      expect(response).toBeHttp({ statusCode: 200 });
      result = [...result, ...response.data.items];
      next = response.data.next;
    } while (next);

    expect(result).toHaveLength(2);
  }, 120000);
});
