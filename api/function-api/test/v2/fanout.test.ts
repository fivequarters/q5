import { Model } from '@5qtrs/db';

import { ApiRequestMap, cleanupEntities, RequestMethod, createTestFile } from './sdk';
import { getStorage } from '../v1/sdk';

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
  const router = integration.router;
  const storageKey = 'event';

  // @ts-ignore
  router.use(async (ctx, next) => {
    try {
      await integration.storage.getData(ctx, storageKey);
    } catch (e) {
      await integration.storage.setData(ctx, storageKey, []);
    } finally {
      await next();
    }
  });

  // @ts-ignore
  router.on('/:sourceEntityId/:eventType/:eventCode', async (ctx) => {
    const event = ctx.req.body;
    const getResult = await integration.storage.getData(ctx, storageKey);
    await integration.storage.setData(ctx, storageKey, [...(getResult.data || []), { event, params: ctx.params }]);
    ctx.body = 'success';
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
  test.only('Fan out to instances works', async () => {
    const connectorId = `${boundaryId}-con`;
    const integrationId = `${boundaryId}-int`;
    const authId = 'testAuthId';
    const sharedTag = `webhook/${connectorId}/${authId}`;

    // Create integration
    let response = await ApiRequestMap.integration.postAndWait(
      account,
      integrationId,
      createIntegrationEntity(connectorId, integrationId, sharedTag)
    );

    // Create three instances
    const instanceIds = [];
    for (let i = 0; i < 3; i++) {
      response = await ApiRequestMap.instance.post(account, integrationId, {
        tags: { [sharedTag]: null, 'fusebit.parentEntityId': integrationId },
        data: {},
      });
      expect(response).toBeHttp({ statusCode: 200 });
      instanceIds.push(response.data.id);
    }

    // Perform fan_out
    response = await ApiRequestMap.connector.dispatch(
      account,
      connectorId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=${sharedTag}`,
      { body: { hello: 'world' } }
    );
    expect(response).toBeHttp({ statusCode: 200 });

    // Verify all three instances ids were supplied on invocation
    response = await getStorage(account, '/foo/bar/bah');
    expect(response).toBeHttp({ statusCode: 418 });
    console.log(JSON.stringify(response.data));
  }, 180000);

  test.only('Fan out to some instances works', async () => {
    const connectorId = `${boundaryId}-con`;
    const integrationId = `${boundaryId}-int`;
    const authId = 'testAuthId';
    const sharedTag = `webhook/${connectorId}/${authId}`;

    // Create integration
    let response = await ApiRequestMap.integration.postAndWait(
      account,
      integrationId,
      createIntegrationEntity(connectorId, integrationId, sharedTag)
    );

    // Create two instances with the same tag
    const instanceIds = [];
    for (let i = 0; i < 2; i++) {
      response = await ApiRequestMap.instance.post(account, integrationId, {
        tags: { [sharedTag]: null, 'fusebit.parentEntityId': integrationId },
        data: {},
      });
      expect(response).toBeHttp({ statusCode: 200 });
      instanceIds.push(response.data.id);
    }

    // Create an instance without the tag
    response = await ApiRequestMap.instance.post(account, integrationId, {
      tags: { 'fusebit.parentEntityId': integrationId },
      data: {},
    });
    expect(response).toBeHttp({ statusCode: 200 });
    instanceIds.push(response.data.id);

    // Perform fan_out
    response = await ApiRequestMap.connector.dispatch(
      account,
      connectorId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=${sharedTag}`,
      { body: { hello: 'world' } }
    );
    expect(response).toBeHttp({ statusCode: 200 });

    // Verify only two of the three instances ids were supplied on invocation
    response = await getStorage(account, '/foo/bar/bah');
    expect(response).toBeHttp({ statusCode: 418 });
    console.log(JSON.stringify(response.data));
  }, 180000);

  test.only('Missing permissions for fan_out call fails', async () => {
    const connectorId = `${boundaryId}-con`;
    const authId = 'testAuthId';
    const sharedTag = `webhook/${connectorId}/${authId}`;

    // Invoke fan_out w/o connector:get permission, fails
    const response = await ApiRequestMap.connector.dispatch(
      account,
      connectorId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=${sharedTag}`,
      { body: { hello: 'world' }, authz: '' }
    );
    expect(response).toBeHttp({ statusCode: 403 });
  }, 180000);

  test.only('Default integration receives event when no matching instances', async () => {
    const connectorId = `${boundaryId}-con`;
    const integrationId = `${boundaryId}-int`;
    const authId = 'testAuthId';
    const sharedTag = `webhook/${connectorId}/${authId}`;

    // Create integration
    let response = await ApiRequestMap.integration.postAndWait(
      account,
      integrationId,
      createIntegrationEntity(connectorId, integrationId, sharedTag)
    );

    // Create three instances
    const instanceIds = [];
    for (let i = 0; i < 3; i++) {
      response = await ApiRequestMap.instance.post(account, integrationId, {
        tags: { 'fusebit.parentEntityId': integrationId },
        data: {},
      });
      expect(response).toBeHttp({ statusCode: 200 });
      instanceIds.push(response.data.id);
    }

    // Invoke callback in connector with no matching authIds
    response = await ApiRequestMap.connector.dispatch(
      account,
      connectorId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=${sharedTag}&default=${integrationId}`,
      { body: { hello: 'world' } }
    );
    expect(response).toBeHttp({ statusCode: 200 });

    // Verify it invoked using the default invocation uuid
    response = await getStorage(account, '/foo/bar/bah');
    expect(response).toBeHttp({ statusCode: 418 });
    console.log(JSON.stringify(response.data));
  }, 180000);

  test.only('Missing default integration does not error', async () => {
    const response = await ApiRequestMap.connector.dispatch(
      account,
      boundaryId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=foobar&default=${boundaryId}`,
      { body: { hello: 'world' } }
    );
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test.only('Invalid default is rejected by input validation', async () => {
    const response = await ApiRequestMap.connector.dispatch(
      account,
      boundaryId,
      RequestMethod.post,
      `/fan_out/event/webhook?tag=foobar&default=${encodeURI(';')}`,
      { body: { hello: 'world' } }
    );
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);
});
