import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';

import * as Constants from '@5qtrs/constants';
import './extendJest';

import { IAccount } from './accountResolver';
import { setupEnvironment } from './common';
import { callFunction, getFunction, putFunction } from './sdk';

const { getAccount, getBoundary } = setupEnvironment();
const function1Id = 'test-fun-authz-1';

describe.skip('function cycle', () => {
  test('looping 50 times', async () => {
    const account = getAccount();
    const boundaryId = getBoundary();

    const spec1 = {
      nodejs: { files: { 'index.js': `module.exports = async (ctx) => { return { body: "teapot", status: 200}; };` } },
    };
    const spec2 = {
      nodejs: { files: { 'index.js': `module.exports = async (ctx) => { return { body: "kettle", status: 200}; };` } },
    };

    let response;

    const callCounts: [number, number][] = [];

    const pollForData = async (url: string, data: string) => {
      let i = 0;
      let res: any;
      const timeStart = Date.now();
      do {
        i++;
        res = await request(url);
        if (res.data === data) {
          break;
        }
      } while (res.status === 200);

      if (i > 1) {
        callCounts.push([i, Date.now() - timeStart]);
      }

      return res;
    };

    for (let i = 0; i < 50; i++) {
      response = await putFunction(account, boundaryId, function1Id, spec1);
      expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
      response = await pollForData(response.data.location, 'teapot');

      response = await putFunction(account, boundaryId, function1Id, spec2);
      expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
      response = await pollForData(response.data.location, 'kettle');
    }

    expect(callCounts).toMatchObject([]);
  }, 300000);
});
