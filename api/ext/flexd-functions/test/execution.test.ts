import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { putFunction, deleteAllFunctions } from './sdk';
import { request } from '@5qtrs/request';

let account: IAccount = FakeAccount;

const boundaryId = 'flx-test-boundary';
const function1Id = 'flx-test-function-1';
const function2Id = 'flx-test-function-2';

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
};

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

beforeAll(async () => {
  account = await resolveAccount();
});

afterAll(async () => {
  await deleteAllFunctions(account);
});

beforeEach(async () => {
  await deleteAllFunctions(account);
});

describe('execution', () => {
  test('hello, world succeeds', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response.status).toEqual(200);
    response = await request(response.data.location);
    console.log(typeof response.data, response.data);
    expect(response.status).toEqual(200);
    expect(response.data).toEqual('hello');
  });

  test('function context APIs work as expected', async () => {
    let response = await putFunction(account, boundaryId, function1Id, reflectContext);
    expect(response.status).toEqual(200);
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
  });
});
