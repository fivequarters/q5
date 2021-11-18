import { v2Permissions } from '@5qtrs/constants';

import { ApiRequestMap, cleanupEntities, createPair, RequestMethod } from './sdk';

import { getEnv } from '../v1/setup';
// Without this, the test doesn't exit because keyStore is still running.
import { keyStore } from '../v1/function.utils';

import { checkAuthorization } from '../../src/routes/functions';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});
afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

describe('Connector Permission', () => {
  test('Force function.utils to clean up', () => {
    // Without this, the function.utils import gets pruned
    let ks = keyStore;
    ks = ks;
  });

  test('Connectors get requested additional permissions', async () => {
    const basePath = `/account/${account.accountId}/subscription/${account.subscriptionId}`;

    const { integrationId, connectorId } = await createPair(
      account,
      boundaryId,
      {},
      {
        handler: './connector',
        files: {
          'connector.js': [
            "const { Connector } = require('@fusebit-int/framework');",
            '',
            'const connector = new Connector();',
            "connector.router.get('/api/token/', async (ctx) => { ctx.body = ctx.state.params.functionAccessToken; });",
            'module.exports = connector;',
          ].join('\n'),
        },
        security: {
          permissions: [
            {
              action: v2Permissions.connector.update,
              resource: `/account/{{accountId}}/subscription/{{subscriptionId}}/connector/{{functionId}}/`,
            },
          ],
        },
      }
    );
    const response = await ApiRequestMap.connector.dispatch(account, connectorId, RequestMethod.get, '/api/token/');
    expect(response).toBeHttp({ statusCode: 200 });
    const token = response.data;

    const allowedTable = [
      { action: v2Permissions.connector.update, resource: `${basePath}/connector/${connectorId}/` },
    ];

    for (const operation of allowedTable) {
      await expect(
        checkAuthorization(account.accountId, token, 'required', undefined, operation)
      ).resolves.toMatchObject({});
    }
  }, 180000);
});
