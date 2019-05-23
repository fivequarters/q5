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
import { request } from '@5qtrs/request';

let account: IAccount = FakeAccount;

let boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
const function1Id = 'test-function-1';

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
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
  boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
  // await deleteAllFunctions(account, boundaryId);
});

afterEach(async () => {
  // boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
  await deleteAllFunctions(account, boundaryId);
});

describe('log', () => {
  function create_positive_log_test(node: string, query: boolean, boundary: boolean) {
    return async function() {
      let response = await putFunction(account, boundaryId, function1Id, {
        nodejs: {
          files: {
            'index.js': `module.exports = (ctx, cb) => { console.log('Hello ' + ctx.query.n); cb(); }`,
            'package.json': {
              engines: {
                node: '8',
              },
            },
          },
        },
      });
      expect(response.status).toEqual(200);
      expect(response.data).toMatchObject({
        location: expect.stringMatching(/^http:|https:/),
      });
      let log = '';
      let functionUrl = response.data.location;
      let driver = account.baseUrl.startsWith('https') ? require('https') : require('http');
      let logReq = driver.get(
        boundary
          ? `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
              account.subscriptionId
            }/boundary/${boundaryId}/log`
          : `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
              account.subscriptionId
            }/boundary/${boundaryId}/function/${function1Id}/log`,
        {
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
          },
          agent: false,
        },
        (res: any) => {
          expect(res.statusCode).toEqual(200);
          expect(res.headers['content-type']).toMatch(/text\/event-stream/);
          res.setEncoding('utf8');
          res.on('data', (d: string) => (log += d));
        }
      );
      if (query) {
        for (var i = 1; i < 5; i++) {
          response = await request(`${functionUrl}?x-fx-logs=1&n=${i}`);
          expect(response.status).toEqual(200);
        }
      } else {
        for (var i = 1; i < 5; i++) {
          response = await request({
            url: `${functionUrl}?n=${i}`,
            headers: {
              'x-fx-logs': '1',
            },
          });
          expect(response.status).toEqual(200);
        }
      }
      await sleep(4000);
      logReq.abort();
      // console.log(log);
      let i1 = log.indexOf('Hello 1');
      let i2 = log.indexOf('Hello 2');
      let i3 = log.indexOf('Hello 3');
      let i4 = log.indexOf('Hello 4');
      expect(i1).toBeGreaterThan(0);
      expect(i2).toBeGreaterThan(i1);
      expect(i3).toBeGreaterThan(i2);
      expect(i4).toBeGreaterThan(i3);
    };
  }

  test(
    'function logs work with x-fx-logs=1 query parameter on node 8',
    create_positive_log_test('8', true, false),
    20000
  );

  test(
    'function logs work with x-fx-logs=1 query parameter on node 10',
    create_positive_log_test('10', true, false),
    20000
  );

  test(
    'function logs work with x-fx-logs request header on node 8',
    create_positive_log_test('8', false, false),
    20000
  );

  test(
    'function logs work with x-fx-logs request header on node 10',
    create_positive_log_test('10', false, false),
    20000
  );

  test(
    'boundary logs work with x-fx-logs=1 query parameter on node 8',
    create_positive_log_test('8', true, true),
    20000
  );

  test(
    'boundary logs work with x-fx-logs=1 query parameter on node 10',
    create_positive_log_test('10', true, true),
    20000
  );
});
