import * as Constants from '@5qtrs/constants';

import { callFunction, getFunction, putFunction } from './sdk';
import * as AuthZ from './authz';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe.skip('Function Race', () => {
  test('looping 50 times', async () => {
    const spec1 = {
      nodejs: { files: { 'index.js': `module.exports = async (ctx) => { return { body: "teapot", status: 200}; };` } },
      security: {
        authentication: 'required',
        // Deny all requests.
        authorization: [{ action: 'function:invalid', resource: '/' }],
      },
    };
    const spec2 = {
      nodejs: { files: { 'index.js': `module.exports = async (ctx) => { return { body: "kettle", status: 200}; };` } },
    };

    // Create a permission w/o function:execute
    const noAccessToken = await AuthZ.getTokenByPerm(AuthZ.permFunctionGet);

    let response;

    const startTime = Date.now();
    for (let i = 0; i < 500; i++) {
      response = await putFunction(account, boundaryId, function1Id, spec1);
      expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
      response = await callFunction(noAccessToken, response.data.location);
      expect(response).toBeHttp({ statusCode: 403 });

      response = await putFunction(account, boundaryId, function1Id, spec2);
      expect(response).toBeHttp({ statusCode: 200, data: { status: 'success' } });
      response = await callFunction(noAccessToken, response.data.location);
      expect(response).toBeHttp({ statusCode: 200, data: 'kettle' });
      if (i % 10 === 0) {
        console.log(`${i}: ${(Date.now() - startTime) / 1000}s`);
      }
    }
  }, 30000000);
});
