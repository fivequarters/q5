import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { putFunction, deleteAllFunctions, waitForBuild } from './sdk';
import { request } from '@5qtrs/request';
import { string } from 'prop-types';

let account: IAccount = FakeAccount;

const boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
const function1Id = 'test-function-1';

beforeAll(async () => {
  account = await resolveAccount();
});

afterAll(async () => {
  await deleteAllFunctions(account, boundaryId);
});

beforeEach(async () => {
  await deleteAllFunctions(account, boundaryId);
});

describe('execution', () => {
  test('hello, world succeeds', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request(response.data.location);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual('hello');
    expect(response.headers['x-fx-response-source']).toEqual('function');
  });

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
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request({
      method: 'POST',
      url: response.data.location,
      data: {
        somedata: 'inthebody',
      },
    });
    expect(response.status).toEqual(200);
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
  });

  test('function can set response status code', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => cb(null, { body: "teapot", status: 418 });`,
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request(response.data.location);
    expect(response.status).toEqual(418);
    expect(response.data).toEqual('teapot');
    expect(response.headers['x-fx-response-source']).toEqual('function');
  });

  test('function can set response headers', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => cb(null, { body: "teapot", headers: { foo: 'abc', bar: 'def' } });`,
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
  });

  test('function without response payload returns empty response', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => cb();`,
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request(response.data.location);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual(undefined);
    expect(response.headers['x-fx-response-source']).toEqual('function');
  });

  test('function with empty response payload returns empty response', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => cb(null, {});`,
        },
      },
    });
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await request(response.data.location);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual(undefined);
    expect(response.headers['x-fx-response-source']).toEqual('function');
  });

  test('function with module dependency can load the module', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'var s = require("superagent"); module.exports = (ctx, cb) => cb(null, { body: typeof s });',
          'package.json': {
            engines: {
              node: '8',
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
      message: expect.stringMatching(/^Unexpected token/),
      properties: {
        errorMessage: expect.stringMatching(/^Unexpected token/),
        errorType: 'SyntaxError',
        stackTrace: expect.any(Array),
      },
    });
  });

  test('function with global exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'throw new Error("Some error"); module.exports = (ctx, cb) => cb(null, { body: "hello" });',
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
        stackTrace: expect.any(Array),
      },
    });
  });

  test('function with synchronous exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => { throw new Error("Sync error"); cb(null, { body: "hello" }); }',
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
        stackTrace: expect.any(Array),
      },
    });
  });

  test('function with callback exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => cb(new Error("Response error"));',
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
        stackTrace: expect.any(Array),
      },
    });
  });

  test('function with async exception fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => {
            setTimeout(() => { throw new Error("Async error"); }, 500);
            setTimeout(() => cb(null, { body: "hello" }), 1000);
          };`,
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
      message: expect.stringMatching(/Process exited before completing request/),
      properties: {
        errorMessage: expect.stringMatching(/Process exited before completing request/),
      },
    });
  });

  test('function with wrong signature fails', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = cb => cb(null, { body: "hello" });`,
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
      message: 'The function must take two parameters: (ctx, cb).',
      properties: {
        errorMessage: 'The function must take two parameters: (ctx, cb).',
        errorType: expect.any(String),
        stackTrace: expect.any(Array),
      },
    });
  });
});
