import { request } from '@5qtrs/request';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('Health', () => {
  test('is healthy', async () => {
    const response = await request(`${account.baseUrl}/v1/health`);
    expect(response).toBeHttp({ statusCode: 200 });
  });
});
