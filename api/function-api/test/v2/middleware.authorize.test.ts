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
    let pair = await createPair(account, boundaryId, undefined, {
      handler: '@fusebit-int/slack-connector',
    });

    let response = await ApiRequestMap.connector.dispatch(account, pair.connectorId, 'GET', '/api/configure', {
      authz: '',
    });
    expect(response).toBeHttp({ statusCode: 403 });
    response = await ApiRequestMap.connector.dispatch(account, pair.connectorId, 'GET', '/api/configure', {
      authz: 'gibberish',
    });
    expect(response).toBeHttp({ statusCode: 403 });
  }, 180000);
});
