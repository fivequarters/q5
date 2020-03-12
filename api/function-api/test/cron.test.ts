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
}, 20000);

beforeEach(async () => {
  await deleteAllFunctions(account, boundaryId);
}, 20000);

describe('cron', () => {
  test('cron executes on schedule', async () => {
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
        cron: '*/2 * * * * *', // run every 2 seconds
      },
    });
    expect([200, 201]).toContain(response.status);
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 15, 1000);
      expect(response.status).toEqual(200);
    }
    expect(response.data.status).toEqual('success');

    // sleep 10 seconds, let the cron run

    await sleep(10000);

    // delete cron job

    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response.status).toEqual(204);

    // Retrieve the storage function to inspect the cron job that ran

    response = await getFunction(account, boundaryId, function2Id);
    expect(response.status).toEqual(200);
    let actualRuns = JSON.parse(Buffer.from(response.data.configuration.runs, 'base64').toString('utf8'));
    expect(actualRuns.length).toBeGreaterThanOrEqual(4);
    actualRuns.sort((a: number, b: number) => a - b);
    let avgTimespan = (actualRuns[actualRuns.length - 1] - actualRuns[0]) / actualRuns.length;
    let minTimespan = 999999;
    let maxTimespan = 0;
    for (var i = 1; i < actualRuns.length; i++) {
      let timespan = actualRuns[i] - actualRuns[i - 1];
      minTimespan = Math.min(minTimespan, timespan);
      maxTimespan = Math.max(maxTimespan, timespan);
    }
    // console.log('RESPONSES', actualRuns.length, avgTimespan, minTimespan, maxTimespan);
    expect(maxTimespan).toBeLessThan(4000);
    expect(avgTimespan).toBeGreaterThan(1000);
    expect(avgTimespan).toBeLessThan(2500);
  }, 30000);
});
