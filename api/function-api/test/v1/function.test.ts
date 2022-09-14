import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';
import * as Constants from '@5qtrs/constants';

import {
  disableFunctionUsageRestriction,
  deleteFunction,
  putFunction,
  getFunction,
  listFunctions,
  getFunctionLocation,
} from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());

  // Tests here don't invoke functions, or if they do they don't care about the result, so the usage
  // restriction doesn't apply
  disableFunctionUsageRestriction();
});

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
};

const helloWorldUpdated = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello - Updated" });',
    },
  },
};

const helloWorldWithLambda = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  lambda: {
    timeout: 90,
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

const helloWorldWithApplicationSettings = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  metadata: {
    fusebit: {
      applicationSettings: 'FOO=123\n BAR  = abc',
    },
  },
};

const helloWorldWithComputeSettings = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  metadata: {
    fusebit: {
      computeSettings: 'timeout= 120',
    },
  },
};

const helloWorldWithCronSettings = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  metadata: {
    fusebit: {
      cronSettings: 'cron=0 0 1 1 *\ntimezone=UTC',
    },
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

const helloWorldJavaScript = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: process.version });',
      'package.json': {},
    },
  },
};

const helloWorldString = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: process.version });',
      'package.json': JSON.stringify({ dependencies: {} }),
    },
  },
};

const helloWorldWithNode10JavaScript = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: process.version });',
      'package.json': {
        engines: {
          node: '10',
        },
        dependencies: {},
      },
    },
  },
};

const helloWorldWithNode12JavaScript = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: process.version });',
      'package.json': {
        engines: {
          node: '12',
        },
        dependencies: {},
      },
    },
  },
};

const helloWorldWithNodeDefaultJavaScript = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: process.version });',
      'package.json': {
        dependencies: {},
      },
    },
  },
};

const helloWorldWithNode14JavaScript = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: process.version });',
      'package.json': {
        engines: {
          node: '14',
        },
        dependencies: {},
      },
    },
  },
};

const helloWorldWithNode16Javascript = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: process.version });',
      'package.json': {
        engines: {
          node: '16',
        },
      },
    },
  },
};

const helloWorldWithMustache = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  security: {
    functionPermissions: {
      allow: [{ action: 'function:put', resource: '/account/{{accountId}}/subscription/{{fusebit.subscriptionId}}/' }],
    },
  },
};

const helloWorldWithBadMustache = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  security: {
    functionPermissions: {
      allow: [
        // Missing } on subscriptionId.
        { action: 'function:put', resource: '/account/{{accountId}}/subscription/{{fusebit.subscriptionId}/' },
      ],
    },
  },
};

describe('Function', () => {
  test('PUT fails with unsupported node.js version 10', async () => {
    const response = await putFunction(account, boundaryId, function1Id, helloWorldWithNode10JavaScript);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 120000);

  test('PUT succeeds with supported node.js version 12', async () => {
    const response = await putFunction(account, boundaryId, function1Id, helloWorldWithNode12JavaScript);
    expect(response).toBeHttp({ statusCode: 200 });
    const version = await request(response.data.location);
    expect(version).toBeHttp({ statusCode: 200 });
    expect(version.data).toMatch(/^v12/);
  }, 120000);

  test('PUT succeeds with supported node.js version 14', async () => {
    const response = await putFunction(account, boundaryId, function1Id, helloWorldWithNode14JavaScript);
    expect(response).toBeHttp({ statusCode: 200 });
    const version = await request(response.data.location);
    expect(version).toBeHttp({ statusCode: 200 });
    expect(version.data).toMatch(/^v14/);
  }, 120000);

  test('PUT succeeds with supported node.js version 16', async () => {
    const response = await putFunction(account, boundaryId, function1Id, helloWorldWithNode16Javascript);
    expect(response).toBeHttp({ statusCode: 200 });
    const version = await request(response.data.location);
    expect(version).toBeHttp({ statusCode: 200 });
    expect(version.data).toMatch(/^v16/);
  }, 120000);

  test('PUT succeeds with default node.js matching version 14', async () => {
    const response = await putFunction(account, boundaryId, function1Id, helloWorldWithNodeDefaultJavaScript);
    expect(response).toBeHttp({ statusCode: 200 });
    const version = await request(response.data.location);
    expect(version).toBeHttp({ statusCode: 200 });
    expect(version.data).toMatch(/^v14/);
  }, 120000);

  test('PUT completes synchronously', async () => {
    const response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
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
  }, 120000);

  test('PUT completes synchronously with no changes to function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 204 });
    expect(response.data).toBeUndefined();
  }, 120000);

  test('PUT with empty compute resets compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSettings);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

    response = await getFunction(account, boundaryId, function1Id);

    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.metadata).toBeUndefined();

    response.data.compute = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

    response = await getFunction(account, boundaryId, function1Id);

    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 120000);

  test('PUT with empty configuration resets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

    response = await getFunction(account, boundaryId, function1Id);

    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata).toEqual({ baz: '123', foo: 'bar' });

    response.data.configuration = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

    response = await getFunction(account, boundaryId, function1Id);

    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.metadata).toEqual({ baz: '123', foo: 'bar' });
  }, 120000);

  test('PUT with empty schedule reset schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

    response = await getFunction(account, boundaryId, function1Id);

    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata).toBeUndefined();

    response.data.schedule = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 120000);

  test('PUT with undefined compute resets compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSettings);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

    response = await getFunction(account, boundaryId, function1Id);

    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.metadata).toBeUndefined();

    response.data.compute = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

    response = await getFunction(account, boundaryId, function1Id);

    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 120000);

  test('PUT with undefined configuration resets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

    response = await getFunction(account, boundaryId, function1Id);

    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata).toEqual({ baz: '123', foo: 'bar' });

    response.data.configuration = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

    response = await getFunction(account, boundaryId, function1Id);

    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.metadata).toEqual({ baz: '123', foo: 'bar' });
  }, 120000);

  test('PUT with undefined schedule reset schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });

    response = await getFunction(account, boundaryId, function1Id);

    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata).toBeUndefined();

    response.data.schedule = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 120000);

  test('PUT and GET roundtrip with no changes to function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response).toBeHttp({ statusCode: 204 });
    expect(response.data).toBeUndefined();
  }, 120000);

  test('PUT still supports lambda property for back-compat', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithLambda);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ staticIp: false, memorySize: 128, timeout: 90 });
  }, 120000);

  test('DELETE removes function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 204 });
    expect(response.data).toBeUndefined();
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 404 });
    expect(response.data).toMatchObject({
      status: 404,
      statusCode: 404,
      message: 'Not Found',
    });
  }, 120000);

  test('DELETE on a non-existing function returns 404', async () => {
    const response = await deleteFunction(account, boundaryId, 'no-such-function');
    expect(response).toBeHttp({ statusCode: 404 });
    expect(response.data).toMatchObject({
      status: 404,
      statusCode: 404,
      message: 'Not Found',
    });
  }, 120000);

  test('DELETE on a deleted function returns 404', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 204 });
    expect(response.data).toBeUndefined();
    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 404 });
    expect(response.data).toMatchObject({
      status: 404,
      statusCode: 404,
      message: 'Not Found',
    });
  }, 120000);

  test('GET retrieves information of simple function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId,
      id: function1Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorld.nodejs);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 120000);

  test('GET retrieves information of function with package.json as JavaScript object', async () => {
    let response = await putFunction(account, boundaryId, function2Id, helloWorldJavaScript);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await getFunction(account, boundaryId, function2Id);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId,
      id: function2Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorldJavaScript.nodejs);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 120000);

  test('GET retrieves information of function with package.json as string', async () => {
    let response = await putFunction(account, boundaryId, function2Id, helloWorldString);
    expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
    response = await getFunction(account, boundaryId, function2Id);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId,
      id: function2Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorldString.nodejs);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 120000);

  test('GET location retrieves function location', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await getFunctionLocation(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual({ location: expect.stringMatching(/^http:|https:/) });
  }, 120000);

  test('GET retrieves information of function with configuration and metadata', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId,
      id: function1Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorldWithConfigurationAndMetadata.nodejs);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.configuration).toEqual(helloWorldWithConfigurationAndMetadata.configuration);
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toEqual({ baz: '123', foo: 'bar' });
  }, 120000);

  test('GET retrieves information of a cron function', async () => {
    let response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await getFunction(account, boundaryId, function2Id);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId,
      id: function2Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorldWithCron.nodejs);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.schedule).toEqual(helloWorldWithCron.schedule);
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 120000);

  test('LIST on boundary retrieves the list of all functions', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await listFunctions(account, boundaryId);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items).toHaveLength(2);
    expect(response.data.items).toEqual(
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
          schedule: helloWorldWithCron.schedule,
          location: (await getFunctionLocation(account, boundaryId, function2Id)).data.location,
        },
      ])
    );
  }, 120000);

  test('LIST on boundary with inclue=all retrieves the list of all functions with tags', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await listFunctions(account, boundaryId, undefined, undefined, undefined, undefined, true);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items).toHaveLength(2);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        {
          boundaryId,
          functionId: function1Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function1Id)).data.location,
          runtime: {
            tags: expect.objectContaining({
              'fusebit.functionId': function1Id,
            }),
          },
        },
        {
          boundaryId,
          functionId: function2Id,
          schedule: helloWorldWithCron.schedule,
          location: (await getFunctionLocation(account, boundaryId, function2Id)).data.location,
          runtime: {
            tags: expect.objectContaining({
              'fusebit.functionId': function2Id,
            }),
          },
        },
      ])
    );
  }, 120000);

  test('LIST on boundary with paging works', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function3Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function4Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function5Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await listFunctions(account, boundaryId, undefined, 2);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual({ items: expect.any(Array), next: expect.any(String) });
    expect(response.data.items).toHaveLength(2);
    expect(response.data.items).toEqual(
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
      ])
    );
    response = await listFunctions(account, boundaryId, undefined, 2, undefined, response.data.next);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual({ items: expect.any(Array), next: expect.any(String) });
    expect(response.data.items).toHaveLength(2);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        {
          boundaryId,
          functionId: function3Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function3Id)).data.location,
        },
        {
          boundaryId,
          functionId: function4Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function4Id)).data.location,
        },
      ])
    );
    response = await listFunctions(account, boundaryId, undefined, 2, undefined, response.data.next);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        {
          boundaryId,
          functionId: function5Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function5Id)).data.location,
        },
      ])
    );
  }, 120000);

  test.skip('Bulk test PUTs', async () => {
    const fns = [];
    const createFunc = async (id: number) => {
      const functionId = `test-function-${random({ lengthInBytes: 8 })}`;
      fns.push(functionId);
      let response = await putFunction(account, boundaryId, functionId, helloWorld);
      if (response.status != 200) {
        console.log(`${response.status} - ${response.data}`);
      }
      response = await deleteFunction(account, boundaryId, functionId);
    };

    for (let i = 0; i < 5; i++) {
      const fs = [];
      for (let k = 0; k < 100; k++) {
        fs.push(createFunc(k));
      }
      await Promise.all(fs);
    }
  }, 120000);

  test('LIST on boundary retrieves the list of non-cron functions', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await listFunctions(account, boundaryId, false);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        {
          boundaryId,
          functionId: function1Id,
          schedule: {},
          location: (await getFunctionLocation(account, boundaryId, function1Id)).data.location,
        },
      ])
    );
  }, 120000);

  test('LIST on boundary retrieves the list of cron functions', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await listFunctions(account, boundaryId, true);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        {
          boundaryId,
          functionId: function2Id,
          schedule: helloWorldWithCron.schedule,
          location: (await getFunctionLocation(account, boundaryId, function2Id)).data.location,
        },
      ])
    );
  }, 120000);

  test('LIST on subscription retrieves the list of all functions', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await listFunctions(account);
    expect(response).toBeHttp({ statusCode: 200 });

    // Only validate that the list is at least large enough to contain those entries; otherwise this test
    // struggles when run in parallel.
    expect(response.data.items.length).toBeGreaterThanOrEqual(2);
  }, 120000);

  test('LIST on subscription with include=all retrieves the list of all functions with tags', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await putFunction(account, boundaryId, function2Id, helloWorldWithCron);
    expect(response).toBeHttp({ statusCode: 200 });

    // Validate that at least two functions are returned, with tags.
    // Note: more specific tests tend to conflict when executed in parallel.
    response = await listFunctions(account, undefined, undefined, undefined, undefined, undefined, true);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.items.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(response.data.items[0].runtime.tags).length).toBeGreaterThan(0);
    expect(Object.keys(response.data.items[1].runtime.tags).length).toBeGreaterThan(0);
  }, 120000);

  test('PUT fails without .nodejs', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {});
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'The `nodejs` body parameter is missing.',
    });
  }, 120000);

  test('PUT fails without .nodejs.files', async () => {
    const response = await putFunction(account, boundaryId, function1Id, { nodejs: {} });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'The `nodejs.files` body parameter is missing.',
    });
  }, 120000);

  test('PUT fails with empty nodejs.files', async () => {
    const response = await putFunction(account, boundaryId, function1Id, { nodejs: { files: {} } });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'nodejs.files.index.js: "index.js" is required',
    });
  }, 120000);

  test('PUT fails with nodejs.files lacking index.js', async () => {
    const response = await putFunction(account, boundaryId, function1Id, { nodejs: { files: { foo: 'bar' } } });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'nodejs.files.index.js: "index.js" is required',
    });
  }, 120000);

  test('PUT fails with malformed package.json', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
          'package.json': 'malformed',
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'The package.json file cannot be parsed as a JSON object.',
    });
  }, 120000);

  test('PUT fails with unsupported node.js version', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
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
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: expect.stringMatching(/^Unable to find Node.js runtime version matching/),
    });
  }, 120000);

  test('PUT fails with unrecognized element in body', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      unexpected: 'foo',
    });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'unexpected: "unexpected" is not allowed',
    });
  }, 120000);

  test('PUT fails with non-string configuration setting', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      configuration: {
        foo: ['1', '2', '3'],
      },
    });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'configuration.foo: "foo" must be a string',
    });
  }, 120000);

  test('PUT fails with too small memory limit', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      compute: {
        memorySize: 0,
      },
    });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'compute.memorySize: "memorySize" must be larger than or equal to 64',
    });
  }, 120000);

  test('PUT fails with too large memory limit', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      compute: {
        memorySize: 999999999999,
      },
    });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'compute.memorySize: "memorySize" must be less than or equal to 3008',
    });
  }, 120000);

  test('PUT fails with too small time limit', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      compute: {
        timeout: 0,
      },
    });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'compute.timeout: "timeout" must be larger than or equal to 1',
    });
  }, 120000);

  test('PUT fails with too large time limit', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      compute: {
        timeout: 901,
      },
    });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'compute.timeout: "timeout" must be less than or equal to 900',
    });
  }, 120000);

  test('PUT fails with invalid cron expression', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      schedule: {
        cron: 'invalid',
      },
    });
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: [
        "The value of 'cron' parameter must be a valid CRON expression.",
        'Check https://crontab.guru/ for reference',
      ].join(' '),
    });
  }, 120000);

  test('PUT fails with invalid timezone', async () => {
    const response = await putFunction(account, boundaryId, function1Id, {
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
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: [
        "The value of 'timezone' parameter must be a valid timezone identifier.",
        'Check https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for reference',
      ].join(' '),
    });
  }, 120000);

  test('PUT updates function without a temporary 404', async () => {
    const response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(await request(response.data.location)).toBeHttp({ statusCode: 200 });

    let failures = 0;
    let stop = false;
    const responses: { [key: number]: number } = {};
    const func = async (delay: number): Promise<boolean> => {
      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, 10 * delay));
      }
      if (!stop) {
        try {
          const getResponse = await request(response.data.location);
          if (getResponse.status !== 200) {
            failures++;
            responses[getResponse.status] = (responses[getResponse.status] || 0) + 1;
          }
        } catch (error) {
          failures++;
        }

        return func(0);
      }
      return true;
    };

    const promises = [];
    for (let i = 1; i < 100; i++) {
      promises.push(func(i));
    }

    const updateResponse = await putFunction(account, boundaryId, function1Id, helloWorldUpdated);
    expect(updateResponse).toBeHttp({ statusCode: 200 });
    stop = true;
    await Promise.all(promises);
    if (failures > 0) {
      console.log(JSON.stringify(responses));
    }
    expect(failures).toBe(0);
  }, 120000);

  test('PUT with Mustache', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithMustache);
    expect(response).toBeHttp({ statusCode: 200 });
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
    response = await getFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(JSON.parse(Constants.getFunctionPermissions(response.data.runtime.tags))).toMatchObject({
      allow: [
        { action: 'function:put', resource: `/account/${account.accountId}/subscription/${account.subscriptionId}/` },
      ],
    });
  }, 120000);

  test('PUT with Bad Mustache', async () => {
    const response = await putFunction(account, boundaryId, function1Id, helloWorldWithBadMustache);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 120000);
});
