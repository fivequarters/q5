import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { putFunction, deleteAllFunctions, waitForBuild } from './sdk';
import { request } from '@5qtrs/request';

let account: IAccount = FakeAccount;

const boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
const function1Id = 'test-function-1';

beforeAll(async () => {
  account = await resolveAccount();
});

afterAll(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 200000);

beforeEach(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 200000);

const httpExpect = (response: any, { statusCode, data, headers, tests }: any): void => {
  try {
    if (statusCode) {
      if (typeof statusCode === 'object') {
        expect(status).toContain(response.status);
      } else {
        expect(response.status).toEqual(statusCode);
      }
    }

    if (data) {
      if (typeof data === 'object') {
        for (let [key, value] of Object.entries(data)) {
          expect(response.data[key]).toEqual(value);
        }
      } else {
        expect(response.data).toEqual(data);
      }
    }

    if (headers) {
      for (let [key, value] of Object.entries(headers)) {
        expect(response.headers[key]).toEqual(value);
      }
    }

    if (tests) {
      for (let test of tests) {
        test();
      }
    }
  } catch (err) {
    err.message = `${err.message}\n\nfailing response:\n${response.status} - ${JSON.stringify(
      response.headers
    )} - ${JSON.stringify(response.data)}`;
    throw err;
  }
};

describe('execution', () => {
  test('hello, world succeeds on node 10', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = async (ctx) => { return { body: "hello" }; };',
          'package.json': {
            engines: {
              node: '10',
            },
          },
        },
      },
    });
    httpExpect(response, { status: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    httpExpect(response, { status: 200, data: 'hello', headers: { 'x-fx-response-source': 'function' } });
  }, 10000);

  test('function with module succeeds on node 10', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = async (ctx) => { return {body: typeof require("superagent") }; };',
          'package.json': {
            dependencies: {
              superagent: '*',
            },
            engines: {
              node: '10',
            },
          },
        },
      },
    });
    httpExpect(response, { status: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 15, 1000);
    }
    httpExpect(response, { status: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    httpExpect(response, { status: 200, data: 'function', headers: { 'x-fx-response-source': 'function' } });
  }, 15000);

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
    httpExpect(response, { status: 200, data: { status: 'success' } });
    response = await request({
      method: 'POST',
      url: response.data.location,
      data: {
        somedata: 'inthebody',
      },
    });
    httpExpect(response, {
      status: 200,
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
  });

  test('function can set response status code', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx) => { return { body: "teapot", status: 418 }; };`,
        },
      },
    });
    httpExpect(response, { status: 200, data: { status: 'success' } });
    response = await request(response.data.location);
    httpExpect(response, { status: 418, data: 'teapot', headers: { 'x-fx-response-source': 'function' } });
  }, 10000);

  test('function can set response headers', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx) => { return { body: "teapot", headers: { foo: 'abc', bar: 'def' } }; };`,
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request(response.data.location);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual('teapot');
    expect(response.headers.foo).toEqual('abc');
    expect(response.headers.bar).toEqual('def');
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 10000);

  test('function without response payload returns empty response', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx) => { };`,
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request(response.data.location);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual(undefined);
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 10000);

  test('function with empty response payload returns empty response', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx) => { return {}; };`,
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request(response.data.location);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual(undefined);
    expect(response.headers['x-fx-response-source']).toEqual('function');
  }, 10000);

  test('function with module dependency can load the module', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'var s = require("superagent"); module.exports = async (ctx) => { return { body: typeof s }; };',
          'package.json': {
            engines: {
              node: '10',
            },
            dependencies: {
              superagent: '*',
            },
          },
        },
      },
    });
    expect([200, 201]).toContain(response.status);
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 15, 1000);
      expect(response.status).toEqual(200);
    }
    expect(response.data).toMatchObject({
      status: 'success',
      location: expect.stringMatching(/^http:|https:/),
    });
    response = await request(response.data.location);
    expect(response.status).toEqual(200);
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
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
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
  }, 15000);

  test('function with global exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'throw new Error("Some error"); module.exports = async (ctx) => { return { body: "hello" }; };',
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
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
  }, 10000);

  test('function with synchronous exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = async (ctx) => { throw new Error("Sync error"); return { body: "hello" }; };',
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request(response.data.location);
    expect(response.status).toEqual(500);
    expect(response.headers['x-fx-response-source']).toEqual('provider');
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
  }, 10000);

  test('function with callback exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = async (ctx) => { throw new Error("Response error"); };',
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request(response.data.location);
    expect(response.status).toEqual(500);
    expect(response.headers['x-fx-response-source']).toEqual('provider');
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
  }, 10000);

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
          'package.json': {
            engines: {
              node: '10',
            },
          },
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
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
  }, 10000);

  test('function with payload below limit succeeds', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx) => {
            return { body: { size: JSON.stringify(ctx.body).length } };
          };`,
          'package.json': {
            engines: {
              node: '10',
            },
          },
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request({
      method: 'POST',
      url: response.data.location,
      headers: { 'content-type': 'application/json' },
      data: { data: '.'.repeat(490 * 1024) },
      parseJson: true,
    });
    expect(response.status).toEqual(200);
    expect(response.headers['x-fx-response-source']).toEqual('function');
    expect(response.data).toMatchObject({
      size: 490 * 1024 + 11,
    });
  }, 10000);

  test('function with payload above limit fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx) => {
            return { body: { size: JSON.stringify(ctx.body).length } };
          };`,
          'package.json': {
            engines: {
              node: '10',
            },
          },
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request({
      method: 'POST',
      url: response.data.location,
      headers: { 'content-type': 'application/json' },
      data: { data: '.'.repeat(520 * 1024) },
      parseJson: true,
    });
    expect(response.status).toEqual(413);
  }, 10000);

  test('function with wrong signature fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = async (ctx, cb) => { return { body: "hello" }; };`,
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request(response.data.location);
    expect(response.status).toEqual(500);
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
  }, 10000);
});
