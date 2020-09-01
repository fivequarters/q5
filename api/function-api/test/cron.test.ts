import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { deleteFunction, putFunction, deleteAllFunctions, waitForBuild, sleep, getFunction } from './sdk';
import { request } from '@5qtrs/request';

let account: IAccount = FakeAccount;

const boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
const function1Id = 'test-function-1';
const function2Id = 'test-function-2';

beforeAll(async () => {
  account = await resolveAccount();
});

afterAll(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 180000);

beforeEach(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 180000);

describe('cron', () => {
  test(
    'cron executes on schedule',
    async () => {
      // Create a "storage" function. Total hack.

      let runs = Buffer.from(JSON.stringify([]), 'utf8').toString('base64');
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
      expect(response.status).toEqual(200);

      // Create cron that re-creates the storage function every second with a timestamp of its execution

      // When running against localhost API, use ngrok URL for base URL
      let testAccount = {
        ...account,
        baseUrl:
          account.baseUrl.indexOf('://localhost') > -1 && process.env.LOGS_HOST
            ? `http://${process.env.LOGS_HOST}`
            : account.baseUrl,
      };

      response = await putFunction(account, boundaryId, function1Id, {
        nodejs: {
          files: {
            'index.js': `const Superagent = require('superagent');
            const Config = require('./config.json');
            const FunctionUrl = Config.account.baseUrl + '/v1/account/' + Config.account.accountId + '/subscription/' 
               + Config.account.subscriptionId + '/boundary/' + Config.boundaryId + '/function/' + Config.functionId;
            module.exports = (ctx, cb) => {
              return Superagent.get(FunctionUrl)
                .set('Authorization', 'Bearer ' + Config.account.accessToken)
                .end((e,r) => {
                  if (e) return cb(e);
                  let runs = JSON.parse(Buffer.from(r.body.configuration.runs, 'base64').toString('utf8'));
                  runs.push(Date.now());
                  runs = Buffer.from(JSON.stringify(runs), 'utf8').toString('base64');
                  return Superagent.put(FunctionUrl)
                    .set('Authorization', 'Bearer ' + Config.account.accessToken)
                    .send({ nodejs: r.body.nodejs, configuration: { runs } })
                    .end((e,r) => cb(e));
                });
            };`,
            'config.json': {
              account: testAccount,
              boundaryId,
              functionId: function2Id,
            },
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
      });
      expect([200, 201]).toContain(response.status);
      if (response.status === 201) {
        response = await waitForBuild(account, response.data, 15, 1000);
        expect(response.status).toEqual(200);
      }
      expect(response.data.status).toEqual('success');

      const getRuns = async () => {
        let response = await getFunction(account, boundaryId, function2Id);
        expect(response.status).toEqual(200);
        return JSON.parse(Buffer.from(response.data.configuration.runs, 'base64').toString('utf8'));
      };

      // sleep 15 minutes to make sure the scheduler is working, let the cron run
      let lastRuns: number[] = [];
      const runDelay = 15;
      for (let n = 0; n < runDelay; n++) {
        await sleep(60 * 1000);
        let runCount = (await getRuns()).length;
        lastRuns.push(runCount);
        if (n > 3) {
          expect(runCount).toBeGreaterThan(0); // Make sure the basic behavior is working.
          expect(lastRuns.every((v) => v === lastRuns[0])).toBeFalsy(); // Make sure it's not stalled.
          lastRuns.shift();
        }
      }

      // delete cron job
      response = await deleteFunction(account, boundaryId, function1Id);
      expect(response.status).toEqual(204);

      // Retrieve the storage function to inspect the cron job that ran
      let actualRuns = await getRuns();
      expect(actualRuns.length).toBeGreaterThanOrEqual(runDelay - 1);

      // Convert to spans
      let spans = actualRuns
        .map((v: number, i: number) => {
          return i > 0 && v - actualRuns[i - 1];
        })
        .slice(1);

      // Calculate average
      let avgTimespan = spans.reduce((t: number, v: number) => t + v, 0) / spans.length;

      // Calcualte min/max
      spans.sort((a: number, b: number) => a - b);
      let [minTimespan, maxTimespan] = [spans[0], spans[spans.length - 1]];

      console.log('RESPONSES', spans.length, avgTimespan, minTimespan, maxTimespan);
      expect(avgTimespan).toBeGreaterThan(58000);
      expect(maxTimespan).toBeLessThan(70000);
      expect(minTimespan).toBeGreaterThan(50000);
    },
    16 * 60 * 1000
  );
});
