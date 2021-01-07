import { disableFunctionUsageRestriction, deleteFunction, putFunction, waitForBuild } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());

  // No function invocations in this test suite; function usage restrictions do not apply as there is no race
  // on lambda update.
  disableFunctionUsageRestriction();
});

const helloWorldWithSuperagentDependency = {
  nodejs: {
    files: {
      'index.js': 'var s = require("superagent"); module.exports = (ctx, cb) => cb(null, { body: typeof s });',
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
};

describe('module', () => {
  test('PUT completes for function with superagent dependency', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithSuperagentDependency);
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 15, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    expect(response.data).toMatchObject({
      status: 'success',
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
      transitions: {
        success: expect.any(String),
      },
      location: expect.stringMatching(/^http:|https:/),
    });
  }, 180000);

  test('PUT completes synchronously for function with superagent dependency if it was built before', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithSuperagentDependency);
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 15, 1000);
    }
    expect(response).toBeHttp({ statusCode: 200, status: 'success' });
    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 204 });
    response = await putFunction(account, boundaryId, function1Id, helloWorldWithSuperagentDependency);
    expect(response).toBeHttp({ statusCode: 200, status: 'success' });
  }, 180000);

  test('PUT completes for function with complex dependencies', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
          'package.json': {
            engines: {
              node: '10',
            },
            dependencies: {
              superagent: '*',
              async: '*',
              mongodb: '*',
              express: '*',
              morgan: '*',
              'http-errors': '*',
            },
          },
        },
      },
    });
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 20, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    expect(response.data).toMatchObject({
      status: 'success',
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
      transitions: {
        success: expect.any(String),
      },
      location: expect.stringMatching(/^http:|https:/),
    });
  }, 180000);

  test('PUT fails for function with nonexistent dependency', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
          'package.json': {
            engines: {
              node: '10',
            },
            dependencies: {
              'i-dont-exist': '*',
            },
          },
        },
      },
    });
    expect(response).toBeHttpError(400, 'Unable to fully resolve module version for i-dont-exist');
  }, 15000);

  test('PUT fails for function with dependency that fails to build', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
          'package.json': {
            engines: {
              node: '10',
            },
            dependencies: {
              clearbit: '1.3.4',
            },
          },
        },
      },
    });
    expect(response).toBeHttp({ statusCode: [200, 201, 429] });
    if (response.status === 429) {
      expect(response).toBeHttpError(429, 'failed to build previously and another attempt is delayed until');
    } else {
      if (response.status === 201) {
        response = await waitForBuild(account, response.data, 20, 1000);
      }
      expect(response).toBeHttp({ statusCode: 400 });
      expect(response.data).toMatchObject({
        status: 400,
        statusCode: 400,
        message: expect.stringMatching(/Command failed/),
        properties: {
          build: {
            status: 'failed',
            subscriptionId: account.subscriptionId,
            boundaryId,
            functionId: function1Id,
            buildId: expect.any(String),
            transitions: {
              failed: expect.any(String),
            },
          },
        },
      });
    }
  }, 15000);
});
