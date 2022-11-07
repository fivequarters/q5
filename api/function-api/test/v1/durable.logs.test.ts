import { request } from '@5qtrs/request';
import { putFunction, sleep, startLogQuery, waitForLogQuery } from './sdk';
import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id } = getEnv());
});

describe.skip('durable logs', () => {
  test(
    'are captured when configured',
    async () => {
      const createAndRunFunction = async (functionId: string, persistLogs: boolean) => {
        let response = await putFunction(account, boundaryId, functionId, {
          nodejs: {
            files: {
              'index.js': `
                module.exports = async (ctx) => {
                  console.log('STDOUT-${functionId}');
                  console.error('STDERR-${functionId}');
                  return { body: 'ok' };
                }
              `,
            },
          },
          compute: {
            persistLogs,
          },
          schedule: {
            cron: '*/10 * * * * *', // run every 10s
          },
        });
        expect(response).toBeHttp({ statusCode: 200 });
        let url = response.data.location;
        response = await request(url);
        expect(response).toBeHttp({ statusCode: 200 });
      };

      const validateLogs = (data: any, functionId: string, persistLogs: boolean) => {
        expect(Array.isArray(data.results)).toBeTruthy();
        expect(data.results.length).toBeGreaterThanOrEqual(2);
        const methods: any = {};
        for (let i = 0; i < data.results.length; i++) {
          expect(data.results[i]).toBeDefined();
          expect(data.results[i].request).toBeDefined();
          const method = data.results[i].request.method;
          expect(method).toBeDefined();
          methods[method] = (methods[method] || 0) + 1;
          if (persistLogs) {
            expect(data.results[i].logs).toMatch(new RegExp(`STDOUT-${functionId}`));
            expect(data.results[i].logs).toMatch(new RegExp(`STDERR-${functionId}`));
          } else {
            expect(data.results[i].logs).toBeUndefined();
          }
        }
        expect(Object.keys(methods).length).toBe(2);
        expect(methods['GET']).toBe(1);
        expect(methods['CRON']).toBeGreaterThanOrEqual(1);
      };

      const validateStats = (data: any, functionId: string, persistLogs: boolean) => {
        expect(Array.isArray(data.results)).toBeTruthy();
        expect(data.results.length).toBe(2);
        for (let i = 0; i < 2; i++) {
          expect(Object.keys(data.results[i]).length).toBe(2);
          expect(data.results[i]['request.method']).toMatch(/^(GET|CRON)$/);
          if (data.results[i]['request.method'] === 'GET') {
            expect(data.results[i]['count(*)']).toBe(1);
          } else {
            expect(data.results[i]['count(*)']).toBeGreaterThanOrEqual(1);
          }
        }
      };

      const expectLogs = async (
        functionId: string,
        persistLogs: boolean,
        api: { subscriptionId?: string; boundaryId?: string; functionId?: string },
        validator: any,
        stats?: boolean
      ) => {
        // Wait until logs are available, no longer than 5 min + 5 * up to 45s
        for (let n = 0; n < 5; n++) {
          let [url, response] = await startLogQuery(account, api, {
            limit: 100,
            from: '-1800',
            filter: `fusebit.modality = 'execution' and fusebit.boundaryId = '${boundaryId}' and fusebit.functionId = '${functionId}'`,
            ...(stats ? { stats: 'count(*) by request.method' } : {}),
          });
          // console.log('DURABLE START QUERY RESPONSE', response.status, JSON.stringify(response.data, null, 2));
          expect(response).toBeHttp({ statusCode: 200, has: ['queryId'] });
          let data = await waitForLogQuery(account, url, response.data.queryId, 45);
          expect(data.recordsMatched).toBeDefined();
          if (data.recordsMatched >= 9) {
            validator(data, functionId, persistLogs);
            return;
          }
          await sleep(60 * 1000);
        }
        throw new Error(`Unable to retrieve Cloud Watch logs for ${functionId}`);
      };

      await createAndRunFunction(function1Id, true);
      await createAndRunFunction(function2Id, false);
      await sleep(60 * 1000);

      // Logs

      // Function level API
      await expectLogs(
        function1Id,
        true,
        {
          subscriptionId: account.subscriptionId,
          boundaryId,
          functionId: function1Id,
        },
        validateLogs
      );
      await expectLogs(
        function2Id,
        false,
        {
          subscriptionId: account.subscriptionId,
          boundaryId,
          functionId: function2Id,
        },
        validateLogs
      );
      // Boundary level API
      await expectLogs(
        function1Id,
        true,
        {
          subscriptionId: account.subscriptionId,
          boundaryId,
        },
        validateLogs
      );
      await expectLogs(
        function2Id,
        false,
        {
          subscriptionId: account.subscriptionId,
          boundaryId,
        },
        validateLogs
      );
      // Subscription level API
      await expectLogs(
        function1Id,
        true,
        {
          subscriptionId: account.subscriptionId,
        },
        validateLogs
      );
      await expectLogs(
        function2Id,
        false,
        {
          subscriptionId: account.subscriptionId,
        },
        validateLogs
      );
      // Account level API
      await expectLogs(function1Id, true, {}, validateLogs);
      await expectLogs(function2Id, false, {}, validateLogs);

      // Stats

      // Function level API
      await expectLogs(
        function1Id,
        true,
        {
          subscriptionId: account.subscriptionId,
          boundaryId,
          functionId: function1Id,
        },
        validateStats,
        true
      );
      // Boundary level API
      await expectLogs(
        function1Id,
        true,
        {
          subscriptionId: account.subscriptionId,
          boundaryId,
        },
        validateStats,
        true
      );
      // Subscription level API
      await expectLogs(
        function1Id,
        true,
        {
          subscriptionId: account.subscriptionId,
        },
        validateStats,
        true
      );
      // Account level API
      await expectLogs(function1Id, true, {}, validateStats, true);
    },
    10 * 60 * 1000 + 5 * 45 * 1000
  );
});
