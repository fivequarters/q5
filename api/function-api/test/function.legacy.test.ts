import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount, cloneWithUserAgent } from './accountResolver';
import { putFunction, getFunction, deleteAllFunctions } from './sdk';

let account: IAccount = FakeAccount;

const boundaryId = `test-boundary-${random({ lengthInBytes: 8 })}`;
const function1Id = 'test-function-1';
const function2Id = 'test-function-2';

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
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
      cronSettings: 'cron=0 0 1 1 *\n   timezone=UTC',
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
  account = await cloneWithUserAgent(account, 'fusebit-editor/1.0.0');
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

  test('PUT with applicationSettings sets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithApplicationSettings);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata).toEqual({
      fusebit: {
        applicationSettings: 'FOO=123\n BAR  = abc',
        computeSettings: 'memorySize=128\ntimeout=30\nstaticIp=false',
      },
    });
  }, 20000);

  test('PUT with computeSettings sets compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSettings);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.metadata).toEqual({
      fusebit: {
        computeSettings: 'timeout= 120\nmemorySize=128\nstaticIp=false',
      },
    });
  }, 20000);

  test('PUT with cronSettings sets schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCronSettings);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata).toEqual({
      fusebit: {
        computeSettings: 'memorySize=128\ntimeout=30\nstaticIp=false',
        cronSettings: 'cron=0 0 1 1 *\n   timezone=UTC',
      },
    });
  }, 20000);

  test('PUT with applicationSettings set to empty string resets applicationSettings', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithApplicationSettings);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata.fusebit.applicationSettings).toEqual('FOO=123\n BAR  = abc');

    response.data.metadata.fusebit.applicationSettings = '';

    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata.fusebit.applicationSettings).toEqual('FOO=123\nBAR=abc');
  }, 20000);

  test('PUT with computeSettings set to empty string resets computeSettings', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSettings);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.metadata.fusebit.computeSettings).toBe('timeout= 120\nmemorySize=128\nstaticIp=false');

    response.data.metadata.fusebit.computeSettings = '';
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.metadata.fusebit.computeSettings).toBe('timeout=120\nmemorySize=128\nstaticIp=false');
  }, 20000);

  test('PUT with cronSettings set to empty string resets schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCronSettings);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata.fusebit.cronSettings).toEqual('cron=0 0 1 1 *\n   timezone=UTC');
    response.data.metadata.fusebit.cronSettings = '';

    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata.fusebit.cronSettings).toEqual('cron=0 0 1 1 *\ntimezone=UTC');
  }, 20000);

  test('PUT with applicationSettings undefined is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });

    response.data.metadata.fusebit.applicationSettings = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
  }, 20000);

  test('PUT with computeSettings undefined is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });

    response.data.metadata.fusebit.computeSettings = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
  }, 20000);

  test('PUT with cronSettings undefined is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });

    response.data.metadata.fusebit.cronSettings = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
  }, 20000);

  test('PUT with empty compute resets compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
    expect(response.data.metadata.fusebit.computeSettings).toEqual('staticIp=true\nmemorySize=128\ntimeout=30');

    response.data.compute = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.metadata.fusebit.computeSettings).toEqual('memorySize=128\ntimeout=30\nstaticIp=false');
  }, 20000);

  test('PUT with empty configuration resets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata.fusebit.applicationSettings).toEqual('FOO=123\nBAR=abc');

    response.data.configuration = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.metadata.fusebit.applicationSettings).toBeUndefined();
  }, 20000);

  test('PUT with empty schedule resets schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata.fusebit.cronSettings).toEqual('cron=0 0 1 1 *\ntimezone=UTC');

    response.data.schedule = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.metadata.fusebit.cronSettings).toBeUndefined();
  }, 20000);

  test('PUT with undefined compute is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
    expect(response.data.metadata.fusebit.computeSettings).toEqual('staticIp=true\nmemorySize=128\ntimeout=30');

    response.data.compute = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
    expect(response.data.metadata.fusebit.computeSettings).toEqual('staticIp=true\nmemorySize=128\ntimeout=30');
  }, 20000);

  test('PUT with undefined configuration is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata.fusebit.applicationSettings).toEqual('FOO=123\nBAR=abc');

    response.data.configuration = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata.fusebit.applicationSettings).toEqual('FOO=123\nBAR=abc');
  }, 20000);

  test('PUT with undefined schedule is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata.fusebit.cronSettings).toEqual('cron=0 0 1 1 *\ntimezone=UTC');

    response.data.schedule = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata.fusebit.cronSettings).toEqual('cron=0 0 1 1 *\ntimezone=UTC');
  }, 20000);

  test('PUT with undefined compute and undefined computeSettings resets compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.metadata.fusebit.computeSettings).toEqual('staticIp=true\nmemorySize=128\ntimeout=30');
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });

    response.data.metadata.fusebit.computeSettings = undefined;
    response.data.compute = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
  }, 20000);

  test('PUT with undefined configuration and undefined applicationSettings resets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata.fusebit.applicationSettings).toEqual('FOO=123\nBAR=abc');

    response.data.metadata.fusebit.applicationSettings = undefined;
    response.data.configuration = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.metadata.fusebit.applicationSettings).toBeUndefined();
  }, 20000);

  test('PUT with undefined schedule and undefined cronSettings resets schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata.fusebit.cronSettings).toEqual('cron=0 0 1 1 *\ntimezone=UTC');

    response.data.metadata.fusebit.cronSettings = undefined;
    response.data.schedule = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.metadata.fusebit.cronSettings).toBeUndefined();
  }, 20000);

  test('PUT with new compute values updates compute and computeSettings', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);

    const data = response.data;
    expect(data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(data.metadata.fusebit.computeSettings).toEqual('memorySize=128\ntimeout=30\nstaticIp=false');

    data.compute.staticIp = true;
    response = await putFunction(account, boundaryId, function1Id, data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
    expect(response.data.metadata.fusebit.computeSettings).toEqual('memorySize=128\ntimeout=30\nstaticIp=true');
  }, 20000);

  test('PUT with new configuration values configuration compute and applicationSettings', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.metadata.fusebit.applicationSettings).toEqual('FOO=123\nBAR=abc');

    response.data.configuration.BAZ = '789';
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc', BAZ: '789' });
    expect(response.data.metadata.fusebit.applicationSettings).toEqual('FOO=123\nBAR=abc\nBAZ=789');
  }, 20000);

  test('PUT with new schedule values updates schedule and cronSettings', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata.fusebit.cronSettings).toEqual('cron=0 0 1 1 *\ntimezone=UTC');

    response.data.schedule.cron = '0 0 1 2 *';
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 2 *', timezone: 'UTC' });
    expect(response.data.metadata.fusebit.cronSettings).toEqual('cron=0 0 1 2 *\ntimezone=UTC');
  }, 20000);

  test('PUT with computeSettings and lambda uses computeSettings', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);

    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
    expect(response.data.metadata.fusebit.computeSettings).toEqual('staticIp=true\nmemorySize=128\ntimeout=30');

    response.data.lambda = { staticIp: false };
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);

    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
    expect(response.data.metadata.fusebit.computeSettings).toEqual('staticIp=true\nmemorySize=128\ntimeout=30');
  }, 20000);

  test('PUT with non-conflicting metadata and structured data changes is supported', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await getFunction(account, boundaryId, function1Id);
    const data = response.data;
    data.compute.timeout = 60;
    data.metadata.fusebit.computeSettings = data.metadata.fusebit.computeSettings.replace('timeout=30', 'timeout=60');
    data.configuration.FOO = '789';
    data.metadata.fusebit.applicationSettings = data.metadata.fusebit.applicationSettings.replace('123', '789');
    response = await putFunction(account, boundaryId, function1Id, data);
    expect(response.status).toEqual(200);
    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ BAR: 'abc', FOO: '789' });
    expect(response.data.compute).toEqual({ timeout: 60, memorySize: 128, staticIp: false });
    expect(response.data.metadata).toEqual({
      foo: 'bar',
      baz: '123',
      fusebit: {
        computeSettings: 'memorySize=128\ntimeout=60\nstaticIp=false',
        applicationSettings: 'FOO=789\nBAR=abc',
      },
    });
  }, 20000);

  test('PUT with conflicting configuration and application settings uses configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationAndMetadata);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await getFunction(account, boundaryId, function1Id);

    const data = response.data;
    data.configuration.BAZ = '789';
    data.metadata.fusebit.applicationSettings = data.metadata.fusebit.applicationSettings.replace('123', '456');
    response = await putFunction(account, boundaryId, function1Id, data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc', BAZ: '789' });
    expect(response.data.metadata.fusebit.applicationSettings).toEqual('FOO=123\nBAR=abc\nBAZ=789');
  }, 20000);

  test('PUT with conflicting schedule and cronSettings uses schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.metadata.fusebit.cronSettings).toEqual('cron=0 0 1 1 *\ntimezone=UTC');

    response.data.schedule.cron = '0 0 1 2 *';
    response.data.metadata.fusebit.cronSettings = 'cron=0 0 1 1 *\ntimezone=Etc/GMT-12';
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 2 *', timezone: 'UTC' });
    expect(response.data.metadata.fusebit.cronSettings).toEqual('cron=0 0 1 2 *\ntimezone=UTC');
  }, 20000);

  test('PUT with conflicting compute and computeSettings uses compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    expect(response.data.status).toEqual('success');
    response = await getFunction(account, boundaryId, function1Id);

    const data = response.data;
    data.compute.timeout = 80;
    data.metadata.fusebit.computeSettings = data.metadata.fusebit.computeSettings.replace(
      'memorySize=128',
      'memorySize=256'
    );

    response = await putFunction(account, boundaryId, function1Id, data);
    expect(response.status).toEqual(200);

    response = await getFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(200);
    expect(response.data.compute).toEqual({ timeout: 80, memorySize: 128, staticIp: false });
    expect(response.data.metadata.fusebit.computeSettings).toEqual('memorySize=128\ntimeout=80\nstaticIp=false');
  }, 20000);

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
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.metadata).toEqual({
      fusebit: {
        computeSettings: 'memorySize=128\ntimeout=30\nstaticIp=false',
      },
    });
    expect(response.data.schedule).toBeUndefined();
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
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.metadata).toEqual({
      fusebit: {
        computeSettings: 'memorySize=128\ntimeout=30\nstaticIp=false',
      },
    });
    expect(response.data.schedule).toBeUndefined();
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
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.metadata).toEqual({
      fusebit: {
        computeSettings: 'memorySize=128\ntimeout=30\nstaticIp=false',
      },
    });
    expect(response.data.schedule).toBeUndefined();
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
    expect(response.data.configuration).toEqual(helloWorldWithConfigurationAndMetadata.configuration);
    expect(response.data.metadata).toEqual({
      baz: '123',
      foo: 'bar',
      fusebit: {
        applicationSettings: 'FOO=123\nBAR=abc',
        computeSettings: 'memorySize=128\ntimeout=30\nstaticIp=false',
      },
    });
    expect(response.data.schedule).toBeUndefined();
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
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.metadata).toEqual({
      fusebit: {
        computeSettings: 'memorySize=128\ntimeout=30\nstaticIp=false',
        cronSettings: 'cron=0 0 1 1 *\ntimezone=UTC',
      },
    });
    expect(response.data.schedule).toEqual(helloWorldWithCron.schedule);
  }, 10000);
});
