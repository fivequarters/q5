import { Model } from '@5qtrs/db';

import { Permissions, v2Permissions } from '@5qtrs/constants';

import { ApiRequestMap, cleanupEntities, createPair } from './sdk';
import * as AuthZ from '../v1/authz';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});
afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

describe('Integration to Connector Permissions', () => {
  test('Integrations have permissions to connector:execute', async () => {
    const { integrationId, connectorId } = await createPair(account, boundaryId);
    let response = await ApiRequestMap.integration.dispatch(account, integrationId, 'GET', '/api/token/');
    expect(response).toBeHttp({ statusCode: 200 });
    const token = response.data;

    const testSet = [
      {
        url: '/api/invalid_key/health',
        codes: [403, 400],
      },
      {
        url: '/api/invalid_key/token',
        codes: [403, 500],
      },
      {
        url: '/api/session/invalid_key/token',
        codes: [403, 500],
      },
      {
        mode: 'DELETE',
        url: '/api/invalid_key',
        codes: [403, 400],
      },
    ];

    for (const test of testSet) {
      // Test with no credentials, make sure it's a 403.
      response = await ApiRequestMap.connector.dispatch(account, connectorId, test.mode || 'GET', test.url, {
        authz: '',
      });
      expect(response).toBeHttp({ statusCode: test.codes[0] });

      // Test with the credentials in the integration, make sure it's... something not a 403.
      response = await ApiRequestMap.connector.dispatch(account, connectorId, test.mode || 'GET', test.url, {
        authz: token,
      });
      expect(response).toBeHttp({ statusCode: test.codes[1] });
    }
  }, 180000);
});
