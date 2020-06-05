import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';
import { IAccount, FakeAccount, resolveAccount, cloneWithUserAgent } from './accountResolver';
import {
  deleteFunction,
  putFunction,
  getFunction,
  listFunctions,
  deleteAllFunctions,
  getFunctionLocation,
} from './sdk';

const util = require('util');
const exec = util.promisify(require('child_process').exec);

let account: IAccount = FakeAccount;

const prob500 = 0.05;
const prob404 = 0.2;
const prob501 = 0.4;

const trafficFunc = {
  nodejs: {
    files: {
      'index.js': `
module.exports = async (ctx) => {
    let sample = Math.random();
    // return { body: "hello" };
    if (sample < ${prob500}) {
        throw new Error('FOOBAR');
    }
    if (sample < ${prob404}) {
        return {status: 404 };
    }
    if (sample < ${prob501}) {
        return {status: 501 };
    }
    return {body: 'hello'};
};`,
    },
  },
};

const numBoundaries = 3;
const numFunctionsPerBoundary = [3, 7];

// Create a bunch of boundaries
const boundaries = Array.apply(null, Array(numBoundaries)).map(
  (x, i) => `test-boundary-${random({ lengthInBytes: 8 })}`
);

// Populate a boundary:function map
const functions: any = [];
boundaries.forEach((b: string) =>
  Array.apply(
    null,
    Array(
      Math.floor(Math.random() * (numFunctionsPerBoundary[1] - numFunctionsPerBoundary[0])) + numFunctionsPerBoundary[0]
    )
  ).forEach((x: any) => functions.push([b, `test-function-${random({ lengthInBytes: 8 })}`]))
);

const execApacheBench = async (url: string, durSecs: number) => {
  try {
    const { stdout, stderr } = await exec(`ab -c 1 -t ${durSecs} ${url}`);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
  } catch (err) {
    console.error(err);
  }
};

beforeAll(async () => {
  account = await resolveAccount();
}, 10000);

afterAll(async () => {
  await Promise.all(boundaries.map((b: string) => deleteAllFunctions(account, b)));
}, 20000);

beforeEach(async () => {
  await Promise.all(boundaries.map((b: string) => deleteAllFunctions(account, b)));
}, 20000);

describe('traffic', () => {
  test(
    `Generate a bunch of traffic for ${process.env.TRAFFIC_DURATION} seconds`,
    async () => {
      if (!process.env.TRAFFIC_DURATION) {
        // No duration specified; quick exit.
        return;
      }
      console.time('setup');
      // Create a bunch of functions.
      // @ts-ignore - pending 3.8
      let responses = await Promise.allSettled(
        functions.map((f: [string, string]) => putFunction(account, f[0], f[1], trafficFunc))
      );
      console.log(responses);
      responses.forEach((r: any) => expect(r.value.status).toEqual(200));
      console.timeEnd('setup');

      const locations = responses.map((r: any) => r.value.data.location);
      console.time('ab');
      // @ts-ignore - pending 3.8
      await Promise.allSettled(locations.map((url: string) => execApacheBench(url, +process.env.TRAFFIC_DURATION)));
      console.timeEnd('ab');
    },
    +(process.env.TRAFFIC_DURATION || 1) * 2 * 1000
  );
});
