import { Model } from '@5qtrs/db';

import { ApiRequestMap, cleanupEntities, RequestMethod, createTestFile } from './sdk';
import { setStorage, getStorage } from '../v1/sdk';

import { IWebhookEvents } from '../../src/routes/schema/connectorFanOut';

import { getEnv } from '../v1/setup';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});
afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

const getTestIntegrationFile = () => {
  const { Integration } = require('@fusebit-int/framework');

  const integration = new Integration();

  // @ts-ignore
  integration.event.on('/:sourceEntityId/:eventType/:eventCode', async (ctx) => {
    const event = ctx.req.body;
    const storage = await integration.storage.getData(ctx, event.data.storageKey);
    await integration.storage.setData(ctx, event.data.storageKey, {
      data: {
        events: [...(storage?.data?.events || []), { event, params: ctx.params }],
      },
    });
    ctx.body = `success1 ${event.data.storageKey} ${JSON.stringify(storage)}`;
  });

  module.exports = integration;
};

const createIntegrationEntity = (connectorId: string, integrationId: string, sharedTag: string) => ({
  data: {
    handler: './integrationTest',
    files: {
      ['integrationTest.js']: createTestFile(getTestIntegrationFile),
    },
    components: [
      {
        name: 'con',
        entityType: Model.EntityType.connector,
        entityId: connectorId,
        provider: '@fusebit-int/oauth-provider',
        dependsOn: [],
      },
    ],
  },
  tags: {
    [sharedTag]: null,
  },
  id: integrationId,
});

describe('Fan Out Endpoint Tests', () => {
  test('Fan out to some but not all installs works', async () => {
    const connectorId = `${boundaryId}-con`;
    const integrationId = `${boundaryId}-int`;
    const authId = 'testAuthId';
    const sharedTag = `webhook/${connectorId}/${authId}`;

    const storageKey = `foo/bar/bah/${boundaryId}`;
    const actualStorageKey = `integration/${integrationId}/${storageKey}`;
    let response;

    const payload: IWebhookEvents = [
      {
        data: { storageKey },
        eventType: 'example',
        entityId: connectorId,
        webhookEventId: 'someEventId',
        webhookAuthId: 'unknown',
      },
    ];

    // Create integration
    response = await ApiRequestMap.integration.postAndWait(
      account,
      integrationId,
      createIntegrationEntity(connectorId, integrationId, sharedTag)
    );
    response = await ApiRequestMap.integration.dispatch(account, integrationId, RequestMethod.get, '/api/health');
    expect(response).toBeHttp({ statusCode: 200 });

    // Create two installs with the same tag
    const installIds = [];
    const invalidInstallIds = [];
    for (let i = 0; i < 2; i++) {
      response = await ApiRequestMap.install.post(account, integrationId, {
        tags: { [sharedTag]: null, 'fusebit.parentEntityId': integrationId },
        data: {},
      });
      expect(response).toBeHttp({ statusCode: 200 });
      installIds.push(response.data.id);
    }

    // Create an install without the tag
    response = await ApiRequestMap.install.post(account, integrationId, {
      tags: { 'fusebit.parentEntityId': integrationId },
      data: {},
    });
    expect(response).toBeHttp({ statusCode: 200 });
    invalidInstallIds.push(response.data.id);

    // Perform fan_out
    response = await ApiRequestMap.connector.dispatch(
      account,
      connectorId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=${sharedTag}`,
      { body: { payload } }
    );

    expect(response).toBeHttp({ statusCode: 200 });

    // Verify just two of the three installs ids were supplied on invocation
    response = await getStorage(account, actualStorageKey);
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        data: {
          events: [
            {
              event: {
                data: {
                  storageKey: `foo/bar/bah/${boundaryId}`,
                },
                entityId: connectorId,
                eventType: 'example',
                webhookAuthId: 'unknown',
                webhookEventId: 'someEventId',
              },
              params: {
                eventCode: 'example',
                eventType: 'webhook',
                sourceEntityId: 'con',
              },
            },
          ],
        },
      },
    });

    expect(response.data.data.events[0].event.installIds.sort()).toEqual(installIds.sort());
  }, 180000);

  test('Missing permissions for fan_out call fails', async () => {
    const connectorId = `${boundaryId}-con`;
    const authId = 'testAuthId';
    const sharedTag = `webhook/${connectorId}/${authId}`;

    const payload: IWebhookEvents = [
      {
        data: {},
        eventType: 'example',
        entityId: connectorId,
        webhookEventId: 'someEventId',
        webhookAuthId: 'unknown',
      },
    ];

    // Invoke fan_out w/o connector:get permission, fails
    const response = await ApiRequestMap.connector.dispatch(
      account,
      connectorId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=${sharedTag}`,
      { body: { payload }, authz: '' }
    );
    expect(response).toBeHttp({ statusCode: 403 });
  }, 180000);

  test('Default integration receives event when no matching installs', async () => {
    const connectorId = `${boundaryId}-con`;
    const integrationId = `${boundaryId}-int`;
    const authId = 'testAuthId';
    const sharedTag = `webhook/${connectorId}/${authId}`;

    const storageKey = `foo/bar/bah/${boundaryId}`;
    const actualStorageKey = `integration/${integrationId}/${storageKey}`;

    // Create integration
    let response = await ApiRequestMap.integration.postAndWait(
      account,
      integrationId,
      createIntegrationEntity(connectorId, integrationId, sharedTag)
    );

    // Create three installs
    const installIds = [];
    for (let i = 0; i < 3; i++) {
      response = await ApiRequestMap.install.post(account, integrationId, {
        tags: { 'fusebit.parentEntityId': integrationId },
        data: {},
      });
      expect(response).toBeHttp({ statusCode: 200 });
      installIds.push(response.data.id);
    }

    const payload: IWebhookEvents = [
      {
        data: { storageKey },
        eventType: 'example',
        entityId: connectorId,
        webhookEventId: 'someEventId',
        webhookAuthId: 'unknown',
      },
    ];
    // Invoke callback in connector with no matching authIds
    response = await ApiRequestMap.connector.dispatch(
      account,
      connectorId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=${sharedTag}&default=${integrationId}`,
      { body: { payload } }
    );
    expect(response).toBeHttp({ statusCode: 200 });

    // Verify it invoked using the default invocation uuid
    response = await getStorage(account, actualStorageKey);
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        data: {
          events: [
            {
              event: {
                data: {
                  storageKey: `foo/bar/bah/${boundaryId}`,
                },
                entityId: connectorId,
                eventType: 'example',
                installIds: ['ins-00000000000000000000000000000000'],
                webhookAuthId: 'unknown',
                webhookEventId: 'someEventId',
              },
              params: {
                eventCode: 'example',
                eventType: 'webhook',
                sourceEntityId: 'con',
              },
            },
          ],
        },
      },
    });
  }, 180000);

  test('Missing default integration generates an error', async () => {
    const payload: IWebhookEvents = [
      {
        data: {},
        eventType: 'example',
        entityId: boundaryId,
        webhookEventId: 'someEventId',
        webhookAuthId: 'unknown',
      },
    ];

    const response = await ApiRequestMap.connector.dispatch(
      account,
      boundaryId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=foobar&default=${boundaryId}`,
      { body: { payload } }
    );
    expect(response).toBeHttp({ statusCode: 500 });
  }, 180000);

  test('Invalid default is rejected by input validation', async () => {
    const response = await ApiRequestMap.connector.dispatch(
      account,
      boundaryId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=foobar&default=${encodeURI(';')}`,
      { body: { hello: 'world' } }
    );
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);
});
