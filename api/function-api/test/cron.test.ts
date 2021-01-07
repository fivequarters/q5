import { request } from '@5qtrs/request';

import { deleteFunction, putFunction, waitForBuild, sleep, getFunction, getLogs } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('cron', () => {
  test(
    'cron executes on schedule',
    async () => {
      // Create a "storage" function. Total hack.

      const runs = Buffer.from(JSON.stringify([]), 'utf8').toString('base64');
      let response = await putFunction(account, boundaryId, function2Id, {
        nodejs: {
          files: {
            'index.js': '.',
          },
        },
        configuration: {
          runs,
        },
      });
      expect(response).toBeHttp({ statusCode: 200 });

      // Create cron that re-creates the storage function every second with a timestamp of its execution

      // When running against localhost API, use ngrok URL for base URL
      const testAccount = {
        ...account,
        baseUrl:
          account.baseUrl.indexOf('://localhost') > -1 && process.env.LOGS_HOST
            ? `http://${process.env.LOGS_HOST}`
            : account.baseUrl,
      };

      const function2Resource =
        '/account/' +
        testAccount.accountId +
        '/subscription/' +
        testAccount.subscriptionId +
        '/boundary/' +
        boundaryId +
        '/function/' +
        function2Id +
        '/';
      const functionUrl = `${testAccount.baseUrl}/v1/${function2Resource}`;

      response = await putFunction(account, boundaryId, function1Id, {
        nodejs: {
          files: {
            'index.js': `
              const Superagent = require('superagent');
              module.exports = async (ctx) => {
                const r = await Superagent.get("${functionUrl}")
                  .set('Authorization', 'Bearer ' + ctx.fusebit.functionAccessToken);

                let runs = JSON.parse(Buffer.from(r.body.configuration.runs, 'base64').toString('utf8'));
                console.log('Number of runs: ', runs.length);
                runs.push(Date.now());
                runs = Buffer.from(JSON.stringify(runs), 'utf8').toString('base64');
                await Superagent.put("${functionUrl}")
                      .set('Authorization', 'Bearer ' + ctx.fusebit.functionAccessToken)
                      .send({ nodejs: r.body.nodejs, configuration: { runs } });
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
          cron: '* * * * *', // run every minute
        },
        security: {
          functionPermissions: {
            allow: [{ action: 'function:*', resource: function2Resource }],
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
        const res = await getFunction(account, boundaryId, function2Id);
        expect(res).toBeHttp({ statusCode: 200 });
        return JSON.parse(Buffer.from(res.data.configuration.runs, 'base64').toString('utf8'));
      };

      // sleep 15 minutes to make sure the scheduler is working, let the cron run
      const lastRuns: number[] = [];
      const runDelay = 15;
      for (let n = 0; n < runDelay; n++) {
        await sleep(60 * 1000);
        const runCount = (await getRuns()).length;
        lastRuns.push(runCount);
        if (n > 3) {
          console.log(`${JSON.stringify(lastRuns)}`);
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

      // Convert to spans
      const spans = actualRuns
        .map((v: number, i: number) => {
          return i > 0 && v - actualRuns[i - 1];
        })
        .slice(1);

      // Calculate average
      const avgTimespan = spans.reduce((t: number, v: number) => t + v, 0) / spans.length;

      // Calcualte min/max
      spans.sort((a: number, b: number) => a - b);
      const [minTimespan, maxTimespan] = [spans[0], spans[spans.length - 1]];

      console.log('RESPONSES', spans.length, avgTimespan, minTimespan, maxTimespan);
      expect(avgTimespan).toBeGreaterThan(58000);
      expect(maxTimespan).toBeLessThan(70000);
      expect(minTimespan).toBeGreaterThan(50000);
    },
    16 * 60 * 1000
  );
});
