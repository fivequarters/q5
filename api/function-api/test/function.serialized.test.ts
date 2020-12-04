import { random } from '@5qtrs/random';
import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { putFunction, getFunction, deleteAllFunctions } from './sdk';

let account: IAccount = FakeAccount;

const boundaryId = `test-boundary-serialized-${random({ lengthInBytes: 8 })}`;
const function1Id = 'test-function-1';

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

const helloWorldWithConfiguration = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  configuration: {
    FOO: '123',
    BAR: 'abc',
  },
};

const helloWorldWithConfigurationSerialized = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  configurationSerialized: 'FOO=123\n BAR  = abc',
};

const helloWorldWithConfigurationSerializedEmptyValue = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  configurationSerialized: 'FOO=\nBAR=abc',
};

const helloWorldWithComputeSerialized = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  computeSerialized: 'timeout= 120',
};

const helloWorldWithScheduleSerialized = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
  scheduleSerialized: 'cron=0 0 1 1 *\n   timezone=UTC',
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

beforeAll(async () => {
  account = await resolveAccount();
}, 120000);

afterAll(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 120000);

beforeEach(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 120000);

describe('function', () => {
  test('PUT completes synchronously', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toBe(200);
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
  }, 120000);

  test('PUT with configurationSerialized sets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.configurationSerialized).toBe('FOO=123\n BAR  = abc');
  }, 120000);

  test('PUT with configurationSerialized with empty value sets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationSerializedEmptyValue);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '', BAR: 'abc' });
    expect(response.data.configurationSerialized).toBe('FOO=\nBAR=abc');

    // Make sure it round-trips correctly.
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(204);
    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '', BAR: 'abc' });
    expect(response.data.configurationSerialized).toBe('FOO=\nBAR=abc');
  }, 120000);

  test('PUT with computeSerialized sets compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('timeout= 120\nmemorySize=128\nstaticIp=false');
    expect(response.data.metadata).toBeUndefined();
  }, 120000);

  test('PUT with scheduleSerialized sets schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithScheduleSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.scheduleSerialized).toBe('cron=0 0 1 1 *\n   timezone=UTC');
    expect(response.data.metadata).toBeUndefined();
  }, 120000);

  test('PUT with configurationSerialized set to empty string resets configurationSerialized', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.configurationSerialized).toBe('FOO=123\n BAR  = abc');

    response.data.configurationSerialized = '';

    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.configurationSerialized).toBe('FOO=123\nBAR=abc');
  }, 120000);

  test('PUT with computeSerialized set to empty string resets computeSerialized', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('timeout= 120\nmemorySize=128\nstaticIp=false');

    response.data.computeSerialized = '';
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('timeout=120\nmemorySize=128\nstaticIp=false');
  }, 120000);

  test('PUT with scheduleSerialized set to empty string resets scheduleSerialized', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithScheduleSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.scheduleSerialized).toBe('cron=0 0 1 1 *\n   timezone=UTC');
    response.data.scheduleSerialized = '';

    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.scheduleSerialized).toBe('cron=0 0 1 1 *\ntimezone=UTC');
  }, 120000);

  test('PUT with configurationSerialized undefined is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfigurationSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });

    response.data.configurationSerialized = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(204);
  }, 120000);

  test('PUT with computeSerialized undefined is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });

    response.data.computeSerialized = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(204);
  }, 120000);

  test('PUT with scheduleSerialized undefined is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithScheduleSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id);

    expect(response.status).toBe(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });

    response.data.scheduleSerialized = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(204);
  }, 120000);

  test('PUT with empty compute resets compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('timeout= 120\nmemorySize=128\nstaticIp=false');

    response.data.compute = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('memorySize=128\ntimeout=30\nstaticIp=false');
  }, 120000);

  test('PUT with empty configuration resets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfiguration);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.configurationSerialized).toBe('FOO=123\nBAR=abc');

    response.data.configuration = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
  }, 120000);

  test('PUT with empty schedule resets schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.scheduleSerialized).toBe('cron=0 0 1 1 *\ntimezone=UTC');

    response.data.schedule = {};
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);

    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
  }, 120000);

  test('PUT with undefined compute is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithStaticIp);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
    expect(response.data.computeSerialized).toBe('staticIp=true\nmemorySize=128\ntimeout=30');

    response.data.compute = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(204);
  }, 120000);

  test('PUT with undefined configuration is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfiguration);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.configurationSerialized).toBe('FOO=123\nBAR=abc');

    response.data.configuration = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(204);
  }, 120000);

  test('PUT with undefined schedule is ignored', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.scheduleSerialized).toBe('cron=0 0 1 1 *\ntimezone=UTC');

    response.data.schedule = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(204);
  }, 120000);

  test('PUT with undefined compute and undefined computeSerialized resets compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithComputeSerialized);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ timeout: 120, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('timeout= 120\nmemorySize=128\nstaticIp=false');

    response.data.computeSerialized = undefined;
    response.data.compute = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('memorySize=128\ntimeout=30\nstaticIp=false');
  }, 120000);

  test('PUT with undefined configuration and undefined configurationSerialized resets configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfiguration);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.configurationSerialized).toBe('FOO=123\nBAR=abc');

    response.data.configurationSerialized = undefined;
    response.data.configuration = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
  }, 120000);

  test('PUT with undefined schedule and undefined scheduleSerialized resets schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.scheduleSerialized).toBe('cron=0 0 1 1 *\ntimezone=UTC');

    response.data.scheduleSerialized = undefined;
    response.data.schedule = undefined;
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
  }, 120000);

  test('PUT with new compute values updates compute and computeSerialized', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toBe(200);

    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);

    const data = response.data;
    expect(data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(data.computeSerialized).toBe('memorySize=128\ntimeout=30\nstaticIp=false');

    data.compute.staticIp = true;
    response = await putFunction(account, boundaryId, function1Id, data);
    expect(response.status).toBe(200);

    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: true });
    expect(response.data.computeSerialized).toBe('memorySize=128\ntimeout=30\nstaticIp=true');
  }, 120000);

  test('PUT with new configuration values updates configuration and configurationSerialized', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfiguration);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc' });
    expect(response.data.configurationSerialized).toBe('FOO=123\nBAR=abc');

    response.data.configuration.BAZ = '789';
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);

    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc', BAZ: '789' });
    expect(response.data.configurationSerialized).toBe('FOO=123\nBAR=abc\nBAZ=789');
  }, 120000);

  test('PUT with new schedule values updates schedule and scheduleSerialized', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.scheduleSerialized).toBe('cron=0 0 1 1 *\ntimezone=UTC');

    response.data.schedule.cron = '0 0 1 2 *';
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);

    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 2 *', timezone: 'UTC' });
    expect(response.data.scheduleSerialized).toBe('cron=0 0 1 2 *\ntimezone=UTC');
  }, 120000);

  test('PUT with non-conflicting serialized and structured data changes is supported', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfiguration);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    response = await getFunction(account, boundaryId, function1Id, true);
    const data = response.data;
    data.compute.timeout = 60;
    data.computeSerialized = data.computeSerialized.replace('timeout=30', 'timeout=60');
    data.configuration.FOO = '789';
    data.configurationSerialized = data.configurationSerialized.replace('123', '789');
    response = await putFunction(account, boundaryId, function1Id, data);
    expect(response.status).toBe(200);
    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ BAR: 'abc', FOO: '789' });
    expect(response.data.configurationSerialized).toBe('FOO=789\nBAR=abc');
    expect(response.data.compute).toEqual({ timeout: 60, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('memorySize=128\ntimeout=60\nstaticIp=false');
  }, 120000);

  test('PUT with conflicting configuration and configurationSerialized uses configuration', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithConfiguration);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    response = await getFunction(account, boundaryId, function1Id, true);

    const data = response.data;
    data.configuration.BAZ = '789';
    data.configurationSerialized = data.configurationSerialized.replace('123', '456');
    response = await putFunction(account, boundaryId, function1Id, data);
    expect(response.status).toBe(200);

    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.configuration).toEqual({ FOO: '123', BAR: 'abc', BAZ: '789' });
    expect(response.data.configurationSerialized).toBe('FOO=123\nBAR=abc\nBAZ=789');
  }, 120000);

  test('PUT with conflicting schedule and scheduleSerialized uses schedule', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorldWithCron);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');

    response = await getFunction(account, boundaryId, function1Id, true);

    expect(response.status).toBe(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 1 *', timezone: 'UTC' });
    expect(response.data.scheduleSerialized).toBe('cron=0 0 1 1 *\ntimezone=UTC');

    response.data.schedule.cron = '0 0 1 2 *';
    response.data.scheduleSerialized = 'cron=0 0 1 1 *\ntimezone=Etc/GMT-12';
    response = await putFunction(account, boundaryId, function1Id, response.data);
    expect(response.status).toBe(200);

    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.schedule).toEqual({ cron: '0 0 1 2 *', timezone: 'UTC' });
    expect(response.data.scheduleSerialized).toBe('cron=0 0 1 2 *\ntimezone=UTC');
  }, 120000);

  test('PUT with conflicting compute and computeSerialized uses compute', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    response = await getFunction(account, boundaryId, function1Id, true);

    const data = response.data;
    data.compute.timeout = 80;
    data.computeSerialized = data.computeSerialized.replace('memorySize=128', 'memorySize=256');

    response = await putFunction(account, boundaryId, function1Id, data);
    expect(response.status).toBe(200);

    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data.compute).toEqual({ timeout: 80, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('memorySize=128\ntimeout=80\nstaticIp=false');
  }, 120000);

  test('GET retrieves information of simple function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('success');
    response = await getFunction(account, boundaryId, function1Id, true);
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      subscriptionId: account.subscriptionId,
      boundaryId: boundaryId,
      id: function1Id,
      location: expect.stringMatching(/^http:|https:/),
    });
    expect(response.data.nodejs).toEqual(helloWorld.nodejs);
    expect(response.data.configuration).toBeUndefined();
    expect(response.data.configurationSerialized).toBeUndefined();
    expect(response.data.compute).toEqual({ timeout: 30, memorySize: 128, staticIp: false });
    expect(response.data.computeSerialized).toBe('memorySize=128\ntimeout=30\nstaticIp=false');
    expect(response.data.schedule).toBeUndefined();
    expect(response.data.scheduleSerialized).toBeUndefined();
    expect(response.data.metadata).toBeUndefined();
  }, 120000);
});
