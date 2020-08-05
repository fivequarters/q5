import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';
import { IAccount, FakeAccount, resolveAccount, cloneWithUserAgent } from './accountResolver';
import {
  deleteFunction,
  putFunction,
  getFunction,
  listFunctions,
  deleteAllFunctions,
  getFunctionLocation,
} from './sdk';

let account: IAccount = FakeAccount;

const boundaryId = `test-boundary-${random({ lengthInBytes: 8 })}`;
const function1Id = 'test-function-1';
const function2Id = 'test-function-2';
const function3Id = 'test-function-3';
const function4Id = 'test-function-4';
const function5Id = 'test-function-5';

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

const helloWorldWithStaticIp = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  compute: {
    staticIp: true,
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
}, 10000);

afterAll(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 20000);

beforeEach(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 20000);

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
  }, 10000);

  test('PUT completes synchronously with no changes to function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(204);
    expect(response.data).toBeUndefined();
  }, 20000);

  test('PUT with empty compute resets compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSettings);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.metadata).toBeUndefined();

    response.data.compute = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 20000);

  test('PUT with empty configuration resets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata).toEqual({ baz: '123', foo: 'bar' });

    response.data.configuration = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.metadata).toEqual({ baz: '123', foo: 'bar' });
  }, 20000);

  test('PUT with empty schedule reset schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata).toBeUndefined();

    response.data.schedule = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 20000);

  test('PUT with undefined compute resets compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSettings);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.metadata).toBeUndefined();

    response.data.compute = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 20000);

  test('PUT with undefined configuration resets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata).toEqual({ baz: '123', foo: 'bar' });

    response.data.configuration = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.metadata).toEqual({ baz: '123', foo: 'bar' });
  }, 20000);

  test('PUT with undefined schedule reset schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata).toBeUndefined();

    response.data.schedule = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 20000);

  test('PUT with new compute values updates compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);

    const data = response.data;
    expect(data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });

    data.compute.staticIp = true;
    response = await putFunction(account, boundaryId, function1Id, data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
  }, 20000);

  test('PUT and GET roundtrip with no changes to function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(204);
    expect(response.data).toBeUndefined();
  }, 10000);

  test('PUT supports setting staticIP=true', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
    expect(response.status).toEqual(200);
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ staticIp: true, memorySize: 128, timeout: 30 });
  }, 10000);

  test('PUT still supports lambda property for back-compat', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithLambda);
    expect(response.status).toEqual(200);
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ staticIp: false, memorySize: 128, timeout: 90 });
  }, 10000);

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
  }, 10000);

  test('DELETE on a non-existing function returns 404', async () => {
    const response = await deleteFunction(account, boundaryId, 'no-such-function');
    expect(response.status).toEqual(404);
    expect(response.data).toMatchObject({
      status: 404,
      statusCode: 404,
      message: 'Not Found',
    });
  }, 10000);

  test('DELETE on a deleted function returns 404', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(204);
    expect(response.data).toBeUndefined();
    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(404);
    expect(response.data).toMatchObject({
      status: 404,
      statusCode: 404,
      message: 'Not Found',
    });
  }, 10000);

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
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 10000);

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
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 10000);

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
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 10000);

  test('GET location retrieves function location', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await getFunctionLocation(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ location: expect.stringMatching(/^http:|https:/) });
  }, 10000);

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
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.configuration).toEqual(helloWorldWithConfigurationAndMetadata.configuration);
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toEqual({ baz: '123', foo: 'bar' });
  }, 10000);

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
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBeUndefined();
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.schedule).toEqual(helloWorldWithCron.schedule);
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 10000);

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
  }, 20000);

  test('LIST on boundary with paging works', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function2Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function3Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function4Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await putFunction(account, boundaryId, function5Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await listFunctions(account, boundaryId, undefined, 2);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ items: expect.any(Array), next: expect.any(String) });
    expect(response.data.items).toHaveLength(2);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        { boundaryId, functionId: function1Id },
        { boundaryId, functionId: function2Id },
      ])
    );
    response = await listFunctions(account, boundaryId, undefined, 2, undefined, response.data.next);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ items: expect.any(Array), next: expect.any(String) });
    expect(response.data.items).toHaveLength(2);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        { boundaryId, functionId: function3Id },
        { boundaryId, functionId: function4Id },
      ])
    );
    response = await listFunctions(account, boundaryId, undefined, 2, undefined, response.data.next);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual({ items: expect.any(Array) });
    expect(response.data.items).toHaveLength(1);
    expect(response.data.items).toEqual(expect.arrayContaining([{ boundaryId, functionId: function5Id }]));
  }, 20000);

  test.skip('Bulk test PUTs', async () => {
    let fns = [];
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
      let fs = [];
      for (let k = 0; k < 100; k++) {
        fs.push(createFunc(k));
      }
      await Promise.all(fs);
    }
  }, 200000);

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
  }, 20000);

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
  }, 20000);

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
  }, 20000);

  test('PUT fails without .nodejs', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {});
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'The `nodejs` body parameter is missing.',
    });
  }, 10000);

  test('PUT fails without .nodejs.files', async () => {
    let response = await putFunction(account, boundaryId, function1Id, { nodejs: {} });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: 'The `nodejs.files` body parameter is missing.',
    });
  }, 10000);

  test('PUT fails with empty nodejs.files', async () => {
    let response = await putFunction(account, boundaryId, function1Id, { nodejs: { files: {} } });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"index.js" is required',
    });
  }, 10000);

  test('PUT fails with nodejs.files lacking index.js', async () => {
    let response = await putFunction(account, boundaryId, function1Id, { nodejs: { files: { foo: 'bar' } } });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"index.js" is required',
    });
  }, 10000);

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
  }, 10000);

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
  }, 10000);

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
  }, 10000);

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
  }, 10000);

  test('PUT fails with too small memory limit', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      compute: {
        memorySize: 0,
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"memorySize" must be larger than or equal to 64',
    });
  }, 10000);

  test('PUT fails with too large memory limit', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      compute: {
        memorySize: 999999999999,
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"memorySize" must be less than or equal to 3008',
    });
  }, 10000);

  test('PUT fails with too small time limit', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      compute: {
        timeout: 0,
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"timeout" must be larger than or equal to 1',
    });
  }, 10000);

  test('PUT fails with too large time limit', async () => {
    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': 'module.exports = cb => cb(null, { body: "hello" });',
        },
      },
      compute: {
        timeout: 121,
      },
    });
    expect(response.status).toEqual(400);
    expect(response.data).toMatchObject({
      status: 400,
      statusCode: 400,
      message: '"timeout" must be less than or equal to 120',
    });
  }, 10000);

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
      message: [
        "The value of 'cron' parameter must be a valid CRON expression.",
        'Check https://crontab.guru/ for reference',
      ].join(' '),
    });
  }, 10000);

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
      message: [
        "The value of 'timezone' parameter must be a valid timezone identifier.",
        'Check https://en.wikipedia.org/wiki/List_of_tz_database_time_zones for reference',
      ].join(' '),
    });
  }, 10000);

  test('PUT updates function without a temporary 404', async () => {
    const response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);

    let failures = 0;
    let stop = false;
    const func = async (delay: number): Promise<boolean> => {
      if (delay) {
        await new Promise((resolve) => setTimeout(resolve, 10 * delay));
      }
      if (!stop) {
        try {
          const getResponse = await request(response.data.location);
          if (getResponse.status !== 200) {
            failures++;
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
    expect(updateResponse.status).toEqual(200);
    stop = true;
    await Promise.all(promises);
    expect(failures).toBe(0);
  }, 20000);
});
