import { cleanupEntities, ApiRequestMap, createPair } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 180000);

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
