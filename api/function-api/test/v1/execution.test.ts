import { request } from '@5qtrs/request';

import { putFunction, waitForBuild } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('Execution', () => {
  test('hello, world succeeds', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual('hello');
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test('function with module succeeds on node 10', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => cb(null, { body: typeof require("superagent") });',
          'package.json': {
            dependencies: {
              superagent: '*',
            },
          },
        },
      },
    });
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 15, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual('function');
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test.skip('Lambda times out after 2 minutes with same return code as normal timeouts', async () => {
    // Currently this test is disabled because the Gateway will time out with a 504 before function-api
    // necessarily gets a chance to do so. Without a force-terminate on function-api's side, this test won't
    // pass.
    const helloWorldThatTimesOut = {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => {while(true){}}',
        },
      },
      compute: {
        timeout: 120,
      },
    };
    const response = await putFunction(account, boundaryId, function1Id, helloWorldThatTimesOut);
    expect(response).toBeHttp({ statusCode: 200 });
    const triggerResponse = await request(response.data.location);
    expect(triggerResponse).toBeHttp({ statusCode: 522 });
  }, 180000);

  test('function context APIs work as expected', async () => {
    const reflectContext = {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => cb(null, { body: ctx });',
        },
      },
      configuration: {
        FOO: 'bar',
      },
    };

    let response = await putFunction(account, boundaryId, function1Id, reflectContext);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request({
      method: 'POST',
      url: response.data.location,
      data: {
        somedata: 'inthebody',
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toMatchObject({
      headers: expect.any(Object),
      query: expect.any(Object),
      body: {
        somedata: 'inthebody',
      },
      configuration: expect.objectContaining(reflectContext.configuration),
      method: 'POST',
      boundaryId,
      functionId: function1Id,
    });
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test('function can set response status code', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => cb(null, { body: "teapot", status: 418 });`,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response.status).toEqual(418);
    expect(response.data).toEqual('teapot');
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test('function can set response headers', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => cb(null, { body: "teapot", headers: { foo: 'abc', bar: 'def' } });`,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual('teapot');
    expect(response.headers.foo).toEqual('abc');
    expect(response.headers.bar).toEqual('def');
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test('function without response payload returns empty response', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => cb();`,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual(undefined);
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test('function with empty response payload returns empty response', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => cb(null, {});`,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual(undefined);
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test('function with module dependency can load the module', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'var s = require("superagent"); module.exports = (ctx, cb) => cb(null, { body: typeof s });',
          'package.json': {
            dependencies: {
              superagent: '*',
            },
          },
        },
      },
    });
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 15, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    expect(response.data).toMatchObject({
      status: 'success',
      location: expect.stringMatching(/^http:|https:/),
    });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual('function');
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test('function with syntax error fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'i do not know my javascript',
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response.status).toEqual(500);
    expect(response.headers['x-fx-response-source']).toEqual('provider');
    expect(response.data).toMatchObject({
      status: 500,
      statusCode: 500,
      message: expect.stringMatching(/Unexpected token/),
      properties: {
        errorMessage: expect.stringMatching(/Unexpected token/),
        errorType: expect.stringMatching(/SyntaxError/),
        // stackTrace: expect.any(Array),
      },
    });
  }, 180000);

  test('function with global exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'throw new Error("Some error"); module.exports = (ctx, cb) => cb(null, { body: "hello" });',
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response.status).toEqual(500);
    expect(response.headers['x-fx-response-source']).toEqual('provider');
    expect(response.data).toMatchObject({
      status: 500,
      statusCode: 500,
      message: 'Some error',
      properties: {
        errorMessage: 'Some error',
        errorType: 'Error',
        // stackTrace: expect.any(Array),
      },
    });
  }, 180000);

  test('function with synchronous exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => { throw new Error("Sync error"); cb(null, { body: "hello" }); }',
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 500 });
    expect(response.headers['x-fx-response-source']).toEqual('function');
    expect(response.data).toMatchObject({
      status: 500,
      statusCode: 500,
      message: 'Sync error',
      properties: {
        errorMessage: 'Sync error',
        errorType: 'Error',
        // stackTrace: expect.any(Array),
      },
    });
  }, 180000);

  test('function with callback exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => cb(new Error("Response error"));',
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response.status).toEqual(500);
    expect(response.headers['x-fx-response-source']).toEqual('function');
    expect(response.data).toMatchObject({
      status: 500,
      statusCode: 500,
      message: 'Response error',
      properties: {
        errorMessage: 'Response error',
        errorType: 'Error',
        // stackTrace: expect.any(Array),
      },
    });
  }, 180000);

  test('function with async exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => {
            setTimeout(() => { throw new Error("Async error"); }, 500);
            setTimeout(() => cb(null, { body: "hello" }), 1000);
          };`,
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response.status).toEqual(500);
    expect(response.headers['x-fx-response-source']).toEqual('provider');
    expect(response.data).toMatchObject({
      status: 500,
      statusCode: 500,
      message: expect.stringMatching(/Async error/),
      properties: {
        errorMessage: expect.stringMatching(/Async error/),
      },
    });
  }, 180000);

  test('function with payload below limit succeeds', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => {
            cb(null, { body: { size: JSON.stringify(ctx.body).length } });
          };`,
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request({
      method: 'POST',
      url: response.data.location,
      headers: { 'content-type': 'application/json' },
      data: { data: '.'.repeat(490 * 1024) },
      parseJson: true,
    });
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.headers['x-fx-response-source']).toEqual('function');
    expect(response.data).toMatchObject({
      size: 490 * 1024 + 11,
    });
  }, 180000);

  test('function with payload above limit fails (application/json)', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => {
            cb(null, { body: { size: JSON.stringify(ctx.body).length } });
          };`,
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request({
      method: 'POST',
      url: response.data.location,
      headers: { 'content-type': 'application/json' },
      data: { data: '.'.repeat(520 * 1024) },
      parseJson: true,
    });
    expect(response.status).toEqual(413);
  }, 180000);

  test('function with wrong signature fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = cb => cb(null, { body: "hello" });`,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response.status).toEqual(500);
    expect(response.headers['x-fx-response-source']).toEqual('provider');
    expect(response.data).toMatchObject({
      status: 500,
      statusCode: 500,
      message: 'The function must take two parameters: (ctx, cb).',
      properties: {
        errorMessage: 'The function must take two parameters: (ctx, cb).',
        errorType: expect.any(String),
        // stackTrace: expect.any(Array),
      },
    });
  }, 180000);

  test('return values ignored in favor of calls to cb()', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => {
            setTimeout(() => cb(null, { body: "hello" }), 1000);
            return { body: "failure"};
          };`,
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual('hello');
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test('Function context has `accountId` present on it', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => cb(null, { body: ctx.accountId });`,
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual(account.accountId);
  }, 180000);

  test('Function with x-www-form-urlencoded works', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => cb(null, { body: ctx.body })',
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    const params = new URLSearchParams();
    params.append('test', '123');

    response = await request({
      method: 'POST',
      url: response.data.location,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: params,
    });
    expect(response).toBeHttp({ statusCode: 200, data: { test: '123' } });
  }, 180000);

  test('function with payload above limit fails (x-www-form-encoded)', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => {
          cb(null, { body: { size: JSON.stringify(ctx.body).length } });
        };`,
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    const params = new URLSearchParams();
    params.append('test', '.'.repeat(520 * 1024));
    const executionResponse = await request({
      method: 'POST',
      url: response.data.location,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      data: params,
    });
    expect(executionResponse.status).toEqual(413);
  }, 180000);
});
