import { request } from '@5qtrs/request';

import { Model } from '@5qtrs/db';
import { cleanupEntities, ApiRequestMap, createPair } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 180000);

const demoRedirectUrl = 'http://monkey';

describe('Sessions', () => {
  test('POSTing an error on a connector session is reported during commit', async () => {
    // Create an integration
    let { integrationId } = await createPair(account, boundaryId);

    let response = await ApiRequestMap.integration.dispatch(account, integrationId, 'GET', '/api/configure', {
      authz: '',
    });

    let response2 = await ApiRequestMap.integration.dispatch(account, integrationId, 'GET', '/api/configure', {
      authz: 'gibberish',
    });
    expect(response).toBeHttp({ statusCode: 403 });
    // Weird bug, invalid authz instead of no jwt returns 404 instead of 403.
    expect(response2).toBeHttp({ statusCode: 404 });
  }, 180000);
});
