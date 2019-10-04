import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { putFunction, deleteAllFunctions, getLogs } from './sdk';
import { request } from '@5qtrs/request';

let account: IAccount = FakeAccount;

let boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
const function1Id = 'test-function-1';

beforeAll(async () => {
  account = await resolveAccount();
});

afterAll(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 20000);

beforeEach(async () => {
  boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
  // await deleteAllFunctions(account, boundaryId);
}, 20000);

afterEach(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 20000);

describe('log', () => {
  function create_positive_log_test(node: string, boundary: boolean) {
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

      const functionUrl = response.data.location;
      const logsPromise = getLogs(account, boundaryId, boundary ? undefined : function1Id);

      // Real time logs can take up to 5s to become effective
      await new Promise(resolve => setTimeout(resolve, 6000));

      for (var i = 1; i < 5; i++) {
        response = await request(`${functionUrl}?n=${i}`);
        expect(response.status).toEqual(200);
      }

      const logResponse = await logsPromise;
      expect(logResponse.status).toEqual(200);
      expect(logResponse.headers['content-type']).toMatch(/text\/event-stream/);
      let i1 = logResponse.data.indexOf('Hello 1');
      let i2 = logResponse.data.indexOf('Hello 2');
      let i3 = logResponse.data.indexOf('Hello 3');
      let i4 = logResponse.data.indexOf('Hello 4');
      expect(i1).toBeGreaterThan(0);
      expect(i2).toBeGreaterThan(i1);
      expect(i3).toBeGreaterThan(i2);
      expect(i4).toBeGreaterThan(i3);
    };
  }

  test('function logs work on node 8', create_positive_log_test('8', false), 20000);

  test('function logs work on node 10', create_positive_log_test('10', false), 20000);

  test('boundary logs work on node 8', create_positive_log_test('8', true), 20000);

  test('boundary logs work on node 10', create_positive_log_test('10', true), 20000);
});
