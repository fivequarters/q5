const util = require('util');
const exec = util.promisify(require('child_process').exec);

import { random } from '@5qtrs/random';

import { putFunction } from './sdk';

import { getEnv, nextBoundary } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

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
const boundaries = Array.apply(null, Array(numBoundaries)).map((x, i) => nextBoundary());

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

describe.skip('traffic', () => {
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
      const responses = await Promise.allSettled(
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
