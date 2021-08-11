import { Model } from '@5qtrs/db';

import { Permissions, v2Permissions } from '@5qtrs/constants';

import { ApiRequestMap, cleanupEntities, createPair } from './sdk';
import * as AuthZ from '../v1/authz';

import { getEnv } from '../v1/setup';
// Without this, the test doesn't exit because keyStore is still running.
import { keyStore } from '../v1/function.utils';

import { checkAuthorization } from '../../src/routes/functions';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

const getSimpleIntegration = (): any => ({
  id: `${boundaryId}-integ`,
  data: {
    components: [],
    componentTags: {},
    configuration: {},

    handler: './integration',
    files: {
      ['integration.js']: '',
    },
  },
});

describe('Integration Permissions', () => {
  test('Force function.utils to clean up', () => {
    // Without this, the function.utils import gets pruned
    let ks = keyStore;
    ks = ks;
  });

  test('Does the integration have the correct set of permissions', async () => {
    const { integrationId, connectorId } = await createPair(account, boundaryId);
    const response = await ApiRequestMap.integration.dispatch(account, integrationId, 'GET', '/api/token/');
    expect(response).toBeHttp({ statusCode: 200 });
    const token = response.data;

    const basePath = `/account/${account.accountId}/subscription/${account.subscriptionId}`;
    const integWart = `/integration/${integrationId}`;
    const allowedTable = [
      { action: Permissions.allStorage, resource: `${basePath}/storage${integWart}/some/path` },
      {
        action: v2Permissions.putSession,
        resource: `${basePath}${integWart}/session/123e4567-e89b-12d3-a456-426614174000`,
      },
      {
        action: v2Permissions.getSession,
        resource: `${basePath}${integWart}/session/123e4567-e89b-12d3-a456-426614174000`,
      },
      {
        action: v2Permissions.connector.execute,
        resource: `${basePath}/connector/${connectorId}/`,
      },
    ];

    for (const operation of allowedTable) {
      await expect(
        checkAuthorization(account.accountId, token, 'required', undefined, operation)
      ).resolves.toMatchObject({});
    }
  }, 180000);

  test('Low-privledge user cannot create an integration', async () => {
    const integEntity = getSimpleIntegration();

    // Create a token that has permissions to write integrations but nothing else.
    const basicPutToken = await AuthZ.getTokenByPerm({
      allow: [
        { action: v2Permissions.integration.put, resource: '/' },
        { action: v2Permissions.integration.get, resource: '/' },
      ],
    });

    // Test with basic permissions, but not enough
    const response = await ApiRequestMap.integration.postAndWait(account, integEntity, undefined, {
      authz: basicPutToken,
    });
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  //
  test('Integration without connectors does not require connector:execute permissions', async () => {
    const integEntity = getSimpleIntegration();

    const simplePutToken = await AuthZ.getTokenByPerm({
      allow: [
        { action: v2Permissions.integration.put, resource: '/' },
        { action: v2Permissions.integration.get, resource: '/' },
        { action: Permissions.allStorage, resource: '/' },
        { action: v2Permissions.putSession, resource: '/' },
        { action: v2Permissions.getSession, resource: '/' },
        { action: v2Permissions.instance.all, resource: '/' },
      ],
    });

    // Test with enough permissions, but no execute - succeeds because no connectors
    const response = await ApiRequestMap.integration.postAndWait(account, integEntity, undefined, {
      authz: simplePutToken,
    });
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Integration with connectors requires execute permissions', async () => {
    const integEntity = getSimpleIntegration();

    // Add a connector to the entity
    integEntity.data.components.push({
      name: 'con',
      entityType: Model.EntityType.connector,
      entityId: `${boundaryId}-conn`,
      provider: '@fusebit-int/oauth-provider',
      dependsOn: [],
    });
    integEntity.id = `${boundaryId}-integ-2`;

    const basePerms = [
      { action: v2Permissions.integration.put, resource: '/' },
      { action: v2Permissions.integration.get, resource: '/' },
      { action: Permissions.allStorage, resource: '/' },
      { action: v2Permissions.putSession, resource: '/' },
      { action: v2Permissions.getSession, resource: '/' },
      { action: v2Permissions.instance.all, resource: '/' },
    ];
    const simplePutToken = await AuthZ.getTokenByPerm({ allow: basePerms });

    const executeToken = await AuthZ.getTokenByPerm({
      allow: [...basePerms, { action: v2Permissions.connector.execute, resource: '/' }],
    });

    // Test with no execute fails
    let response = await ApiRequestMap.integration.postAndWait(account, integEntity, undefined, {
      authz: simplePutToken,
    });
    expect(response).toBeHttp({ statusCode: 400 });

    // Test with execute succeeds
    response = await ApiRequestMap.integration.postAndWait(account, integEntity, undefined, { authz: executeToken });
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Create an entity without any authz fails', async () => {
    const integEntity = getSimpleIntegration();

    // Test with no permissions
    const response = await ApiRequestMap.integration.post(account, integEntity, { authz: '' });
    expect(response).toBeHttp({ statusCode: 403 });
  }, 180000);
});
