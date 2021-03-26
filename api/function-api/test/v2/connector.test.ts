import { request } from '@5qtrs/request';

import { listConnectors } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('Connector', () => {
  test('List Connectors', async () => {
    const response = await listConnectors(account);
    expect(response).toBeHttp({ statusCode: 200 });
  });
});
