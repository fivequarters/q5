import { Model } from '@5qtrs/db';

import { Permissions, v2Permissions } from '@5qtrs/constants';

import { ApiRequestMap, cleanupEntities, createPair, RequestMethod } from './sdk';
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
  await new Promise((res) => setTimeout(res, 30000));
}, 30000);

const getSimpleIntegration = (): any => ({
  id: `${boundaryId}-integ`,
  data: {
    components: [],
    componentTags: {},
    configuration: {},

    handler: './integration',
    files: {
      'integration.js': "module.exports = new (require('@fusebit-int/framework').Integration)();",
    },
  },
});

const getBackendIntegration = (): any => ({
  id: `${boundaryId}-integ`,
  data: {
    components: [],
    componentTags: {},
    configuration: {},

    handler: './integration',
    files: {
      'integration.js': [
        "const { Integration } = require('@fusebit-int/framework');",
        '',
        'const integration = new Integration();',
        "integration.router.get('/api/', async (ctx) => { });",
        "integration.router.get('/api/token/', async (ctx) => { ctx.body = ctx.state.params.functionAccessToken; });",
        'module.exports = integration;',
      ].join('\n'),
    },
    security: {
      permissions: [
        {
          action: v2Permissions.addSession,
          resource: `/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/`,
        },
        {
          action: v2Permissions.commitSession,
          resource: `/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/`,
        },
        {
          action: v2Permissions.integration.delete,
          resource: `/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/`,
        },
      ],
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
    const response = await ApiRequestMap.integration.dispatch(account, integrationId, RequestMethod.get, '/api/token/');
    expect(response).toBeHttp({ statusCode: 200 });
    const token = response.data;

    const basePath = `/account/${account.accountId}/subscription/${account.subscriptionId}`;
    const integWart = `/integration/${integrationId}`;
    const allowedTable = [
      { action: Permissions.allStorage, resource: `${basePath}/storage${integWart}/some/path` },
      {
        action: v2Permissions.updateSession,
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

  test('Low-privilege user cannot create an integration', async () => {
    const integEntity = getSimpleIntegration();

    // Create a token that has permissions to write integrations but nothing else.
    const basicPutToken = await AuthZ.getTokenByPerm({
      allow: [
        { action: v2Permissions.integration.add, resource: '/' },
        { action: v2Permissions.integration.get, resource: '/' },
      ],
    });

    // Test with basic permissions, but not enough
    let response = await ApiRequestMap.integration.postAndWait(
      account,
      integEntity.id,
      integEntity,
      { allowFailure: true },
      {
        authz: basicPutToken,
      }
    );
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        state: Model.EntityState.invalid,
        operationState: {
          operation: Model.OperationType.creating,
          status: Model.OperationStatus.failed,
          errorCode: Model.OperationErrorCode.InvalidParameterValue,
        },
      },
    });
    response = await ApiRequestMap.integration.dispatch(account, integEntity.id, RequestMethod.get, '/api/health');
    expect(response).toBeHttp({ statusCode: 404 });
  }, 180000);

  //
  test('Integration without connectors does not require connector:execute permissions', async () => {
    const integEntity = getSimpleIntegration();

    const simplePutToken = await AuthZ.getTokenByPerm({
      allow: [
        { action: Permissions.allStorage, resource: '/' },
        { action: Permissions.scheduleFunction, resource: '/' },
        { action: v2Permissions.integration.add, resource: '/' },
        { action: v2Permissions.integration.get, resource: '/' },
        { action: v2Permissions.updateSession, resource: '/' },
        { action: v2Permissions.getSession, resource: '/' },
        { action: v2Permissions.install.all, resource: '/' },
      ],
    });

    // Test with enough permissions, but no execute - succeeds because no connectors
    let response = await ApiRequestMap.integration.postAndWait(account, integEntity.id, integEntity, undefined, {
      authz: simplePutToken,
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        state: Model.EntityState.active,
        operationState: {
          operation: Model.OperationType.creating,
          status: Model.OperationStatus.success,
        },
      },
    });

    response = await ApiRequestMap.integration.dispatch(account, integEntity.id, RequestMethod.get, '/api/health');
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
      { action: v2Permissions.integration.add, resource: '/' },
      { action: v2Permissions.integration.get, resource: '/' },
      { action: Permissions.allStorage, resource: '/' },
      { action: v2Permissions.updateSession, resource: '/' },
      { action: v2Permissions.getSession, resource: '/' },
      { action: v2Permissions.install.all, resource: '/' },
    ];
    const simplePutToken = await AuthZ.getTokenByPerm({ allow: basePerms });

    const executeToken = await AuthZ.getTokenByPerm({
      allow: [...basePerms, { action: v2Permissions.connector.execute, resource: '/' }],
    });

    // Test with no execute fails
    let response = await ApiRequestMap.integration.postAndWait(
      account,
      integEntity.id,
      integEntity,
      { allowFailure: true },
      {
        authz: simplePutToken,
      }
    );
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        state: Model.EntityState.invalid,
        operationState: {
          operation: Model.OperationType.creating,
          status: Model.OperationStatus.failed,
          errorCode: Model.OperationErrorCode.InvalidParameterValue,
        },
      },
    });

    response = await ApiRequestMap.integration.dispatch(account, integEntity.id, RequestMethod.get, '/api/health');
    expect(response).toBeHttp({ statusCode: 404 });

    // Test with execute succeeds; must do a PUT now because the previous POST will create an object in an
    // invalid state.
    response = await ApiRequestMap.integration.putAndWait(account, integEntity.id, integEntity, undefined, {
      authz: executeToken,
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        state: Model.EntityState.active,
        operationState: {
          operation: Model.OperationType.updating,
          status: Model.OperationStatus.success,
        },
      },
    });

    response = await ApiRequestMap.integration.dispatch(account, integEntity.id, RequestMethod.get, '/api/health');
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Create an entity without any authz fails', async () => {
    const integEntity = getSimpleIntegration();

    // Test with no permissions
    const response = await ApiRequestMap.integration.post(account, integEntity.id, integEntity, { authz: '' });
    expect(response).toBeHttp({ statusCode: 403 });
  }, 180000);

  test('Does the integration have backend and custom permissions', async () => {
    const integEntity = getBackendIntegration();

    let response = await ApiRequestMap.integration.postAndWait(account, integEntity.id, integEntity);

    response = await ApiRequestMap.integration.dispatch(account, integEntity.id, RequestMethod.get, '/api/token/');
    expect(response).toBeHttp({ statusCode: 200 });
    const token = response.data;

    const basePath = `/account/${account.accountId}/subscription/${account.subscriptionId}`;
    const integWart = `/integration/${integEntity.id}`;
    const allowedTable = [
      {
        action: v2Permissions.addSession,
        resource: `${basePath}${integWart}/session/123e4567-e89b-12d3-a456-426614174000`,
      },
      {
        action: v2Permissions.commitSession,
        resource: `${basePath}${integWart}/session/123e4567-e89b-12d3-a456-426614174000`,
      },
      {
        action: v2Permissions.integration.delete,
        resource: `${basePath}${integWart}/`,
      },
    ];

    for (const operation of allowedTable) {
      await expect(
        checkAuthorization(account.accountId, token, 'required', undefined, operation)
      ).resolves.toMatchObject({});
    }
  }, 180000);
});
