import { request } from '@5qtrs/request';

import { putFunction, getLogs } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('Log', () => {
  function create_positive_log_test(boundary: boolean) {
    return async () => {
      let response = await putFunction(account, boundaryId, function1Id, {
        nodejs: {
          files: {
            'index.js': `module.exports = (ctx, cb) => { console.log('Hello ' + ctx.query.n); cb(); }`,
            'package.json': {},
          },
        },
      });
      expect(response).toBeHttp({ statusCode: 200 });
      expect(response.data).toMatchObject({
        location: expect.stringMatching(/^http:|https:/),
      });

      const functionUrl = response.data.location;
      const logsPromise = getLogs(account, boundaryId, boundary ? undefined : function1Id);

      // Real time logs can take up to 5s to become effective
      await new Promise((resolve) => setTimeout(resolve, 6000));

      for (let i = 1; i < 5; i++) {
        response = await request(`${functionUrl}?n=${i}`);
        expect(response).toBeHttp({ statusCode: 200 });
      }

      // Wait for logs to drain
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const logResponse = await logsPromise;
      expect(logResponse).toBeHttp({ statusCode: 200 });
      expect(logResponse.headers['content-type']).toMatch(/text\/event-stream/);
      const i1 = logResponse.data.indexOf('Hello 1');
      const i2 = logResponse.data.indexOf('Hello 2');
      const i3 = logResponse.data.indexOf('Hello 3');
      const i4 = logResponse.data.indexOf('Hello 4');
      expect(i1).toBeGreaterThan(0);
      expect(i2).toBeGreaterThan(i1);
      expect(i3).toBeGreaterThan(i2);
      expect(i4).toBeGreaterThan(i3);
    };
  }

  test('function logs work on node 14', create_positive_log_test(false), 120000);

  test('boundary logs work on node 14', create_positive_log_test(true), 120000);

  function create_exception_log_test(ret: boolean, sync: boolean) {
    return async () => {
      let response = await putFunction(account, boundaryId, function1Id, {
        nodejs: {
          files: {
            'index.js': ret
              ? `module.exports = (ctx, cb) => { console.log('ALL IS WELL'); cb(new Error('Foo')); }`
              : sync
              ? `module.exports = (ctx, cb) => { console.log('ALL IS WELL'); throw new Error('Foo'); }`
              : `module.exports = (ctx, cb) => { console.log('ALL IS WELL'); setTimeout(() => { throw new Error('Foo'); }, 1000); }`,
            'package.json': {},
          },
        },
      });
      expect(response).toBeHttp({ statusCode: 200 });
      expect(response.data).toMatchObject({
        location: expect.stringMatching(/^http:|https:/),
      });

      const functionUrl = response.data.location;
      const logsPromise = getLogs(account, boundaryId, function1Id);

      // Real time logs can take up to 5s to become effective
      await new Promise((resolve) => setTimeout(resolve, 6000));

      response = await request(functionUrl);
      expect(response).toBeHttp({ statusCode: 500 });

      // Wait for logs to drain
      await new Promise((resolve) => setTimeout(resolve, 4000));

      const logResponse = await logsPromise;
      expect(logResponse).toBeHttp({ statusCode: 200 });
      expect(logResponse.headers['content-type']).toMatch(/text\/event-stream/);
      const i1 = logResponse.data.indexOf('ALL IS WELL');
      const i2 = logResponse.data.indexOf('Foo');
      expect(i1).toBeGreaterThan(0);
      expect(i2).toBeGreaterThan(i1);
    };
  }

  test('sync exception is propagated to logs', create_exception_log_test(false, true), 120000);

  test('async exception is propagated to logs', create_exception_log_test(false, false), 120000);

  test('returned exception is propagated to logs', create_exception_log_test(true, false), 120000);
});
