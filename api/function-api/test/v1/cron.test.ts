import { request } from '@5qtrs/request';

import { deleteFunction, putFunction, waitForBuild, sleep, getLogs, getStorage } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('cron', () => {
  test(
    'cron executes on schedule',
    async () => {
      // Determine the storageId
      const storageId = `boundary/${boundaryId}/function/${function1Id}/`;

      // Create cron that writes to storage with a timestamp of its execution

      // When running against localhost API, use ngrok URL for base URL
      const testAccount = {
        ...account,
        baseUrl:
          account.baseUrl.indexOf('://localhost') > -1 && process.env.LOGS_HOST
            ? `https://${process.env.LOGS_HOST}`
            : account.baseUrl,
      };

      const storageIdResource =
        '/account/' + testAccount.accountId + '/subscription/' + testAccount.subscriptionId + '/storage/' + storageId;
      const storageUrl = `${testAccount.baseUrl}/v1${storageIdResource}`;

      let response = await putFunction(account, boundaryId, function1Id, {
        nodejs: {
          files: {
            'index.js': `
              const Superagent = require('superagent');
              module.exports = async (ctx) => {
                const now = Date.now();
                const r = await Superagent.get("${storageUrl}")
                  .set('Authorization', 'Bearer ' + ctx.fusebit.functionAccessToken)
                  .ok(r => r.statusCode === 200 || r.statusCode === 404);

                let runs = r.body && r.body.data || [];
                console.log('Number of runs: ', runs.length);
                runs.push(now);
                await Superagent.put("${storageUrl}")
                      .set('Authorization', 'Bearer ' + ctx.fusebit.functionAccessToken)
                      .send({ data: runs });
              }
            `,
            'package.json': {
              dependencies: {
                superagent: '*',
              },
            },
          },
        },
        schedule: {
          cron: '*/1 * * * *', // run at the start of every minute
        },
        security: {
          functionPermissions: {
            allow: [{ action: 'storage:*', resource: storageIdResource }],
          },
        },
      });
      expect(response).toBeHttp({ statusCode: [200, 201] });

      if (response.status === 201) {
        response = await waitForBuild(account, response.data, 15, 1000);
        expect(response).toBeHttp({ statusCode: 200 });
      }
      expect(response.data.status).toEqual('success');

      // Start logging for the first 10 minutes, to make sure both function-api triggered and cron-scheduler
      // triggered events are captured.  The timer is set to 15, but the connection is unlikely to stay open
      // that long due to internal configuration entities.
      const logsPromise = getLogs(account, boundaryId, function1Id, false, 15 * 60 * 1000);

      const getRuns = async () => {
        const res = await getStorage(account, storageId);
        expect(res).toBeHttp({ statusCode: 200 });
        return (res.data && res.data.data) || [];
      };

      // sleep 15 minutes to make sure the scheduler is working, let the cron run
      const lastRuns: number[] = [];
      const runDelay = 15;
      for (let n = 0; n < runDelay; n++) {
        await sleep(60 * 1000);
        const runCount = (await getRuns()).length;
        lastRuns.push(runCount);
        if (n > 3) {
          expect(runCount).toBeGreaterThan(0); // Make sure the basic behavior is working.
          expect(lastRuns.every((v) => v === lastRuns[0])).toBeFalsy(); // Make sure it's not stalled.
          lastRuns.shift();
        }
      }

      const logResponse = await logsPromise;
      expect(logResponse).toBeHttp({ statusCode: 200 });
      expect(logResponse.headers['content-type']).toMatch(/text\/event-stream/);

      // Make sure we got at least halfway through the number of events to maximize the chance we validate
      // both function-api scheduled events as well as cron-scheduler triggered events.
      expect(logResponse.data.indexOf('Number of runs:  8') > 0);

      // delete cron job
      response = await deleteFunction(account, boundaryId, function1Id);
      expect(response.status).toEqual(204);

      // Retrieve the storage function to inspect the cron job that ran
      const actualRuns = await getRuns();
      expect(actualRuns.length).toBeGreaterThanOrEqual(runDelay - 1);

      // Compute target first execution time
      // The +10000 is meant to address clock differences between laptop and cloud
      // when running the test locally.
      const targetFirst = Math.floor((actualRuns[0] + 10000) / 60000) * 60000;

      // Calculate deltas from target execution time
      const deltas = actualRuns.map((v: number, i: number) => v - (targetFirst + 60000 * i));
      const avgDelta = deltas.reduce((t: number, v: number) => t + v, 0) / deltas.length;
      deltas.sort((a: number, b: number) => b - a);
      const maxDelta = deltas[0];

      if (avgDelta >= 20000 || maxDelta >= 45000) {
        console.log('CRON RESULT', {
          deltas,
          avgDelta,
          maxDelta,
        });
      }

      expect(avgDelta).toBeLessThan(20000);
      expect(maxDelta).toBeLessThan(45000);
    },
    16 * 60 * 1000
  );
});
