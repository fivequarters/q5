import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import {
  deleteFunction,
  putFunction,
  getFunction,
  listFunctions,
  deleteAllFunctions,
  getFunctionLocation,
} from './sdk';

let account: IAccount = FakeAccount;

const boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
const function1Id = 'test-function-1';
const function2Id = 'test-function-2';

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

beforeAll(async () => {
  account = await resolveAccount();
});

afterAll(async () => {
  await deleteAllFunctions(account);
});

beforeEach(async () => {
  await deleteAllFunctions(account);
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
      id: expect.any(String),
      transitions: {
        success: expect.any(String),
      },
      location: expect.stringMatching(/^http:|https:/),
    });
  });

  test('PUT completes synchronously with no changes to function', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
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
    expect(response.data.schedule).toEqual({});
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
    expect(response.data.schedule).toEqual({});
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
    expect(response.data.items).toHaveLength(2);
    expect(response.data.items).toEqual(
      expect.arrayContaining([
        { boundaryId, functionId: function1Id },
        { boundaryId, functionId: function2Id, schedule: helloWorldWithCron.schedule },
      ])
    );
  }, 10000);
});
