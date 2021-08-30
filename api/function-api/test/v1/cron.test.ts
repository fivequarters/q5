import { request } from '@5qtrs/request';

import { deleteFunction, putFunction, waitForBuild, sleep, getFunction, getLogs, getStorage } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('cron', () => {
  const expectedRuns = 15;

  test(
    'cron executes on schedule',
    async () => {
      await createCronFunction();
      const timestamps = await probeRunsWhileWaitingForCompletion();
      await deleteCronFunction();

      const timespansBetweenRuns = await getTimespansBetweenRunsSorted(timestamps);

      const totalTimespan = timespansBetweenRuns.reduce((total, currentTimespan) => total + currentTimespan, 0);
      const avgTimespan = totalTimespan / timespansBetweenRuns.length;
      const minTimespan = timespansBetweenRuns[0];
      const maxTimespan = timespansBetweenRuns[timespansBetweenRuns.length - 1];

      console.log('RESPONSES', timespansBetweenRuns.length, avgTimespan, minTimespan, maxTimespan);
      expect(avgTimespan).toBeGreaterThan(58000);
      expect(maxTimespan).toBeLessThan(70000);
      expect(minTimespan).toBeGreaterThan(50000);
    },
    16 * 60 * 1000
  );

  async function getRuns() {
    const res = await getStorage(account, boundaryId);
    expect(res).toBeHttp({ statusCode: 200 });
    return res.data.data.timestamps;
  }

  function getTimespansBetweenRunsSorted(timestamps: number[]): number[] {
    // first run usually takes longer to start and breaks test
    const timestampsWithoutFirstEntry = timestamps.slice(1);

    console.log('timestampsWithoutFirstEntry', timestampsWithoutFirstEntry);

    // Convert to spans
    const spans = timestampsWithoutFirstEntry
      .map((timestamp, idx) => (idx > 0 ? timestamp - timestampsWithoutFirstEntry[idx - 1] : 0))
      .sort((a, b) => a - b)
      .slice(1);

    console.log('spans', spans);

    return spans;
  }

  async function probeRunsWhileWaitingForCompletion() {
    // Start logging for the first 10 minutes, to make sure both function-api triggered and cron-scheduler
    // triggered events are captured.  The timer is set to 15, but the connection is unlikely to stay open
    // that long due to internal configuration entities.
    const logsPromise = getLogs(account, boundaryId, function1Id, false, expectedRuns * 60 * 1000);

    // sleep 15 minutes to make sure the scheduler is working, let the cron run
    let timestamps = [];
    while (timestamps.length < expectedRuns) {
      await sleep(60 * 1000);
      timestamps = await getRuns();
      console.log('Timestamps', timestamps);
    }

    const logResponse = await logsPromise;
    expect(logResponse).toBeHttp({ statusCode: 200 });
    expect(logResponse.headers['content-type']).toMatch(/text\/event-stream/);

    // Make sure we got at least halfway through the number of events to maximize the chance we validate
    // both function-api scheduled events as well as cron-scheduler triggered events.
    expect(logResponse.data.indexOf('Number of runs:  8') > 0);

    return timestamps;
  }

  async function deleteCronFunction() {
    // delete cron job
    const response = await deleteFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(204);
  }

  async function createCronFunction() {
    // When running against localhost API, use ngrok URL for base URL
    const testAccount = {
      ...account,
      baseUrl:
        account.baseUrl.indexOf('://localhost') > -1 && process.env.LOGS_HOST
          ? `https://${process.env.LOGS_HOST}`
          : account.baseUrl,
    };

    let response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `
            const superagent = require("superagent");

            module.exports = async (ctx) => {
              const thisExecutionTimestamp = Date.now();
              const { accountId, subscriptionId, functionId, fusebit } = ctx;
              const storageUrl = \`${testAccount.baseUrl}/v1/account/${testAccount.accountId}/subscription/${testAccount.subscriptionId}/storage/${boundaryId}\`;

              const storageResponse = await superagent
                .get(storageUrl)
                .set("authorization", \`bearer \$\{fusebit.functionAccessToken\}\`)
                .ok((res) => res.status === 404 || res.status < 300);

              const { data } = storageResponse.body;

              const timestamps = data ? data.timestamps : [];
              
              timestamps.push(thisExecutionTimestamp);
              console.log('Number of runs: ', timestamps.length);

              await superagent
                .put(storageUrl)
                .set("authorization", \`bearer \$\{fusebit.functionAccessToken\}\`)
                .set("content-type", "application/json")
                .send({ data: { timestamps } });
            };
          `,
          'package.json': {
            dependencies: {
              superagent: '^6.1.0',
            },
          },
        },
      },
      schedule: {
        cron: '* * * * *', // run every minute
      },
      security: {
        functionPermissions: {
          allow: [
            {
              action: 'storage:*',
              resource: `/account/${testAccount.accountId}/subscription/${testAccount.subscriptionId}/storage/${boundaryId}/`,
            },
          ],
        },
      },
    });
    expect(response).toBeHttp({ statusCode: [200, 201] });

    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 15, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    expect(response.data.status).toEqual('success');
  }
});
