import { cleanupEntities, ApiRequestMap, createPair, RequestMethod } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 180000);

describe('Middleware Authorization Test', () => {
  test('POSTing a connector with an improper JWT token to the connector configuration endpoint.', async () => {
    // Create an integration
    const pair = await createPair(account, boundaryId);

    let response = await ApiRequestMap.connector.dispatch(
      account,
      pair.connectorId,
      RequestMethod.get,
      '/api/configure',
      {
        authz: '',
      }
    );
    expect(response).toBeHttp({ statusCode: 403 });
    response = await ApiRequestMap.connector.dispatch(account, pair.connectorId, RequestMethod.get, '/api/configure', {
      authz: 'gibberish',
    });
    expect(response).toBeHttp({ statusCode: 403 });

    response = await ApiRequestMap.connector.dispatch(account, pair.connectorId, RequestMethod.get, '/api/configure');
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);
});
