import { request } from '@5qtrs/request';

import { putFunction, waitForBuild } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('Execution Async', () => {
  test('hello, world succeeds', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = async (ctx) => { return { body: "hello" }; };',
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('function with module succeeds', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = async (ctx) => { return {body: typeof require("superagent") }; };',
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
    }
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200, data: 'function', headers: { 'x-fx-response-source': 'function' } });
  }, 150000);

  test('function context APIs work as expected', async () => {
    const reflectContext = {
      nodejs: {
        files: {
          'index.js': 'module.exports = async (ctx) => { return { body: ctx }; };',
        },
      },
      configuration: {
        FOO: 'bar',
      },
    };

    let response = await putFunction(account, boundaryId, function1Id, reflectContext);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await request({
      method: 'POST',
      url: response.data.location,
      data: {
        somedata: 'inthebody',
      },
    });
    expect(response).toBeHttp({
      statusCode: 200,
      headers: { 'x-fx-response-source': 'function' },
      tests: [
        () =>
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
          }),
      ],
    });
  }, 180000);

  test('function can set response status code', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx) => { return { body: "teapot", status: 418 }; };`,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 418, data: 'teapot', headers: { 'x-fx-response-source': 'function' } });
  }, 180000);

  test('function can set response headers', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx) => { return { body: "teapot", headers: { foo: 'abc', bar: 'def' } }; };`,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
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
          'index.js': `module.exports = async (ctx) => { };`,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual(undefined);
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test('function with empty response payload returns empty response', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx) => { return {}; };`,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual(undefined);
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 180000);

  test('function with module dependency can load the module', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'var s = require("superagent"); module.exports = async (ctx) => { return { body: typeof s }; };',
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
  }, 15000);

  test('function with syntax error fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'i do not know my javascript',
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 500 });
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
  }, 15000);

  test('function with global exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'throw new Error("Some error"); module.exports = async (ctx) => { return { body: "hello" }; };',
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 500 });
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
          'index.js': 'module.exports = async (ctx) => { throw new Error("Sync error"); return { body: "hello" }; };',
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
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
          'index.js': 'module.exports = async (ctx) => { throw new Error("Response error"); };',
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 500 });
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
          'index.js': `module.exports = async (ctx) => {
            return Promise.all([
                new Promise((resolve, reject) => {
                  setTimeout(() => { throw new Error("Async error"); }, 500);
                }),
                new Promise((resolve, reject) => {
                  setTimeout(() => { resolve({ body: "hello" }); }, 1000);
                })
            ]);
          };`,
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 500 });
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
          'index.js': `module.exports = async (ctx) => {
            return { body: { size: JSON.stringify(ctx.body).length } };
          };`,
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
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

  test('function with payload above limit fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx) => {
            return { body: { size: JSON.stringify(ctx.body).length } };
          };`,
          'package.json': {},
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
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
          'index.js': `module.exports = async (ctx, cb) => { return { body: "hello" }; };`,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 500 });
    expect(response.headers['x-fx-response-source']).toEqual('provider');
    expect(response.data).toMatchObject({
      status: 500,
      statusCode: 500,
      message: 'The function must take one parameter: async (ctx).',
      properties: {
        errorMessage: 'The function must take one parameter: async (ctx).',
        errorType: expect.any(String),
        // stackTrace: expect.any(Array),
      },
    });
  }, 180000);
});
