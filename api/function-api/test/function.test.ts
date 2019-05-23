import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import {
  deleteFunction,
  putFunction,
  getFunction,
  listFunctions,
  deleteAllFunctions,
  getFunctionLocation,
  sleep,
} from './sdk';

let account: IAccount = FakeAccount;

const boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
const function1Id = 'test-function-1';
const function2Id = 'test-function-2';
const function3Id = 'test-function-3';

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
};

const helloWorldWithConfigurationAndMetadata = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  configuration: {
    FOO: '123',
    BAR: 'abc',
  },
  metadata: {
    foo: 'bar',
    baz: '123',
  },
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

const helloWorldWithNode8JavaScript = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
      'package.json': {
        engines: {
          node: '10',
        },
        dependencies: {},
      },
    },
  },
};

const helloWorldWithNode8String = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
      'package.json': JSON.stringify({
        engines: {
          node: '10',
        },
        dependencies: {},
      }),
    },
  },
};

beforeAll(async () => {
  account = await resolveAccount();
});

afterAll(async () => {
  await deleteAllFunctions(account, boundaryId);
});

beforeEach(async () => {
  await deleteAllFunctions(account, boundaryId);
});

describe('function', () => {
  test('PUT completes synchronously', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    expect(response.data).toMatchObject({
      status: 'success',
      subscriptionId: account.subscriptionId,
      boundaryId: boundaryId,
      functionId: function1Id,
      transitions: {
        success: expect.any(String),
      },
      location: expect.stringMatching(/^http:|https:/),
    });
  });

  test('PUT completes synchronously with no changes to function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(204);
    expect(response.data).toBeUndefined();
  });

  test('DELETE removes function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(204);
    expect(response.data).toBeUndefined();
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(404);
    expect(response.data).toMatchObject({
      status: 404,
      statusCode: 404,
      message: 'Not Found',
    });
  });

  test('GET retrieves information of simple function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId: boundaryId,
      id: function1Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorld.nodejs);
    expect(response.data.configuration).toEqual({});
    expect(response.data.metadata).toEqual({});
    expect(response.data.schedule).toEqual(undefined);
  });

  test('GET retrieves information of function with package.json as JavaScript object', async () => {
    let response = await putFunction(account, boundaryId, function2Id, helloWorldWithNode8JavaScript);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await getFunction(account, boundaryId, function2Id);
    expect(response.status).toEqual(200);
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId: boundaryId,
      id: function2Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorldWithNode8JavaScript.nodejs);
    expect(response.data.configuration).toEqual({});
    expect(response.data.metadata).toEqual({});
    expect(response.data.schedule).toEqual(undefined);
  });

  test('GET retrieves information of function with package.json as string', async () => {
    let response = await putFunction(account, boundaryId, function2Id, helloWorldWithNode8String);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await getFunction(account, boundaryId, function2Id);
    expect(response.status).toEqual(200);
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId: boundaryId,
      id: function2Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorldWithNode8String.nodejs);
    expect(response.data.configuration).toEqual({});
    expect(response.data.metadata).toEqual({});
    expect(response.data.schedule).toEqual(undefined);
  });

  test('GET location retrieves function location', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await getFunctionLocation(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ location: expect.stringMatching(/^http:|https:/) });
  });

  test('GET retrieves information of function with configuration and metadata', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response.status).toEqual(200);
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId: boundaryId,
      id: function1Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorldWithConfigurationAndMetadata.nodejs);
    expect(response.data.configuration).toEqual(helloWorldWithConfigurationAndMetadata.configuration);
    expect(response.data.metadata).toEqual(helloWorldWithConfigurationAndMetadata.metadata);
    expect(response.data.schedule).toEqual(undefined);
  });

  test('GET retrieves information of a cron function', async () => {
    let response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    response = await getFunction(account, boundaryId, function2Id);
    expect(response.status).toEqual(200);
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId: boundaryId,
      id: function2Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorldWithCron.nodejs);
    expect(response.data.configuration).toEqual({});
    expect(response.data.metadata).toEqual({});
    expect(response.data.schedule).toEqual(helloWorldWithCron.schedule);
  });

  test('LIST on boundary retrieves the list of all functions', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    response = await listFunctions(account, boundaryId);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items).toHaveLength(2);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        { boundaryId, functionId: function1Id },
        { boundaryId, functionId: function2Id, schedule: helloWorldWithCron.schedule },
      ])
    );
  }, 10000);

  test('LIST on boundary with paging works', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function2Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function3Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await listFunctions(account, boundaryId, undefined, 2);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ items: expect.any(Array), next: expect.any(String) });
    expect(response.data.items).toHaveLength(2);
    expect(response.data.items).toEqual(
      expect.arrayContaining([{ boundaryId, functionId: function1Id }, { boundaryId, functionId: function2Id }])
    );
    response = await listFunctions(account, boundaryId, undefined, undefined, response.data.next);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items).toEqual(expect.arrayContaining([{ boundaryId, functionId: function3Id }]));
  }, 15000);

  test('LIST on boundary retrieves the list of non-cron functions', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    response = await listFunctions(account, boundaryId, false);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items).toEqual(expect.arrayContaining([{ boundaryId, functionId: function1Id }]));
  }, 10000);

  test('LIST on boundary retrieves the list of cron functions', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    response = await listFunctions(account, boundaryId, true);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items).toEqual(
      expect.arrayContaining([{ boundaryId, functionId: function2Id, schedule: helloWorldWithCron.schedule }])
    );
  }, 10000);

  test('LIST on subscription retrieves the list of all functions', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    response = await listFunctions(account);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items.length).toBeGreaterThanOrEqual(2);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        { boundaryId, functionId: function1Id },
        { boundaryId, functionId: function2Id, schedule: helloWorldWithCron.schedule },
      ])
    );
  }, 10000);

  test('PUT fails without .nodejs', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {});
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'The `nodejs` body parameter is missing.',
    });
  });

  test('PUT fails without .nodejs.files', async () => {
    let response = await putFunction(account, boundaryId, function1Id, { nodejs: {} });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'The `nodejs.files` body parameter is missing.',
    });
  });

  test('PUT fails with empty nodejs.files', async () => {
    let response = await putFunction(account, boundaryId, function1Id, { nodejs: { files: {} } });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"index.js" is required',
    });
  });

  test('PUT fails with nodejs.files lacking index.js', async () => {
    let response = await putFunction(account, boundaryId, function1Id, { nodejs: { files: { foo: 'bar' } } });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"index.js" is required',
    });
  });

  test('PUT fails with malformed package.json', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
          'package.json': 'malformed',
        },
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'The package.json file cannot be parsed as a JSON object.',
    });
  });

  test('PUT fails with unsupported node.js version', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
          'package.json': {
            engines: {
              node: '1',
            },
          },
        },
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: expect.stringMatching(/^Unable to find Node.js runtime version matching/),
    });
  });

  test('PUT fails with unrecognized element in body', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      unexpected: 'foo',
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"unexpected" is not allowed',
    });
  });

  test('PUT fails with non-string configuration setting', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      configuration: {
        foo: ['1', '2', '3'],
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"foo" must be a string',
    });
  });

  test('PUT fails with too small memory limit', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      lambda: {
        memorySize: 0,
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"memorySize" must be larger than or equal to 64',
    });
  });

  test('PUT fails with too large memory limit', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      lambda: {
        memorySize: 999999999999,
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"memorySize" must be less than or equal to 3008',
    });
  });

  test('PUT fails with too small time limit', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      lambda: {
        timeout: 0,
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"timeout" must be larger than or equal to 1',
    });
  });

  test('PUT fails with too large time limit', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      lambda: {
        timeout: 901,
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"timeout" must be less than or equal to 900',
    });
  });

  test('PUT fails with empty schedule object', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      schedule: {},
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"cron" is required',
    });
  });

  test('PUT fails with invalid cron expression', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      schedule: {
        cron: 'invalid',
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message:
        'The value of `schedule.cron` body parameter must be a valid CRON expression. Check https://crontab.guru/ for reference.',
    });
  });

  test('PUT fails with invalid timezone', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      schedule: {
        cron: '0 0 * * *',
        timezone: 'invalid',
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message:
        'The value of `schedule.timezone` body parameter must be a valid timezone identifier. Check https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for reference.',
    });
  });
});
