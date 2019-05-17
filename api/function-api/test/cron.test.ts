import { IAccount, FakeAccount, resolveAccount } from './accountResolver';
import { deleteFunction, putFunction, deleteAllFunctions, waitForBuild, sleep } from './sdk';
import { request } from '@5qtrs/request';

let account: IAccount = FakeAccount;

const boundaryId = `test-boundary-${Math.floor(Math.random() * 99999999).toString(32)}`;
const function1Id = 'test-function-1';

beforeAll(async () => {
  account = await resolveAccount();
});

afterAll(async () => {
  await deleteAllFunctions(account, boundaryId);
});

beforeEach(async () => {
  await deleteAllFunctions(account, boundaryId);
});

describe('cron', () => {
  test('postb.in external dependency works', async () => {
    let response = await request({
      method: 'POST',
      url: `https://postb.in/api/bin`,
    });
    expect(response.status).toEqual(201);
    expect(response.data.binId).toMatch(/.+/);
    let binId = response.data.binId;
    await request({
      method: 'POST',
      url: `https://postb.in/${binId}`,
      data: { timestamp: Date.now() },
    });
    let responses: any[] = [];
    while (true) {
      response = await request({
        method: 'GET',
        url: `https://postb.in/api/bin/${binId}/req/shift`,
      });
      if (response.status === 200) {
        responses.push(response.data);
      } else {
        expect(response.status).toEqual(404);
        break;
      }
    }
    expect(responses.length).toEqual(1);
    expect(responses[0].body).toMatchObject({
      timestamp: expect.any(Number),
    });
  }, 10000);

  test('cron executes on schedule', async () => {
    // Create postb.in bin
    let response = await request({
      method: 'POST',
      url: `https://postb.in/api/bin`,
    });
    expect(response.status).toEqual(201);
    expect(response.data.binId).toMatch(/.+/);
    let binId = response.data.binId;
    let postbinUrl = `https://postb.in/${binId}`;

    // Create cron that writes to the bin every second

    response = await putFunction(account, boundaryId, function1Id, {
      nodejs: {
        files: {
          'index.js': `module.exports = (ctx, cb) => {
            return require('superagent').post(ctx.configuration.POSTBIN_URL)
              .send({ timestamp: Date.now() })
              .end((e,d) => e ? cb(e) : cb());
          };`,
          'package.json': {
            dependencies: {
              superagent: '*',
            },
          },
        },
      },
      configuration: {
        POSTBIN_URL: postbinUrl,
      },
      schedule: {
        cron: '*/1 * * * * *', // run every second
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

    // Read requests from bin

    let responses: any[] = [];
    while (true) {
      response = await request({
        method: 'GET',
        url: `https://postb.in/api/bin/${binId}/req/shift`,
      });
      if (response.status === 200) {
        responses.push(response.data);
      } else {
        expect(response.status).toEqual(404);
        break;
      }
    }

    expect(responses.length).toBeGreaterThanOrEqual(8);
    responses.sort((a, b) => a.body.timestamp - b.body.timestamp);
    let avgTimespan = (responses[responses.length - 1].body.timestamp - responses[0].body.timestamp) / responses.length;
    let minTimespan = 999999;
    let maxTimespan = 0;
    for (var i = 1; i < responses.length; i++) {
      let timespan = responses[i].body.timestamp - responses[i - 1].body.timestamp;
      // console.log(i, responses[i].body.timestamp, timespan);
      minTimespan = Math.min(minTimespan, timespan);
      maxTimespan = Math.max(maxTimespan, timespan);
    }
    // console.log('RESPONSES', responses.length, avgTimespan, minTimespan, maxTimespan);
    expect(maxTimespan).toBeLessThan(2000);
    expect(avgTimespan).toBeGreaterThan(500);
    expect(avgTimespan).toBeLessThan(1500);
  }, 20000);
});
