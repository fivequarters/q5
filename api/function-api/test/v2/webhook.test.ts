import { Model } from '@5qtrs/db';
import { cleanupEntities, ApiRequestMap, RequestMethod, createTestFile } from './sdk';
import { getEnv } from '../v1/setup';

let { account, boundaryId } = getEnv();
beforeEach(async () => {
  ({ account, boundaryId } = getEnv());
  const createConnectorResponse = await ApiRequestMap.connector.postAndWait(account, connectorId, connectorEntity);
  expect(createConnectorResponse).toBeHttp({ statusCode: 200 });
  const createIntegrationResponse = await ApiRequestMap.integration.postAndWait(
    account,
    integrationId,
    integrationEntity
  );
  expect(createIntegrationResponse).toBeHttp({ statusCode: 200 });
  const createInstanceResponse = await ApiRequestMap.instance.post(account, integrationId, {
    tags: { [sharedTag]: null, 'fusebit.parentEntityId': integrationId },
    data: {},
  });
  expect(createInstanceResponse).toBeHttp({ statusCode: 200 });
  await resetCounter();
}, 180000);

afterAll(async () => {
  await cleanupEntities(account);
}, 180000);

const FrameworkVersion = '^4.0.1';
const counterPath = '/api/counter';
const resetCountPath = '/api/reset';
const authId = 'testAuthId';
const connectorName = 'con';
const incrementEventName = 'increment';
const incrementEventPath = `/${connectorName}/${incrementEventName}`;
const decrementEventName = 'decrement';
const decrementEventPath = `/${connectorName}/${decrementEventName}`;
const connectorId = `${boundaryId}--con`;
const integrationId = `${boundaryId}--int`;
const sharedTag = `webhook/${connectorId}/${authId}`;

const getTestIntegrationFile = () => {
  const { Integration } = require('@fusebit-int/framework');

  const integration = new Integration();
  const router = integration.router;
  const storageKey = 'eventCounter';

  // @ts-ignore
  router.use(async (ctx, next) => {
    try {
      await integration.storage.getData(ctx, storageKey);
    } catch (e) {
      await integration.storage.setData(ctx, storageKey, { count: 0 });
    } finally {
      await next();
    }
  });

  // @ts-ignore
  router.on('incrementEventPath', async (ctx) => {
    const number = ctx.event.data.value;
    const getResult = await integration.storage.getData(ctx, storageKey);
    await integration.storage.setData(ctx, storageKey, {
      count: getResult.data.count + number,
    });
  });

  // @ts-ignore
  router.on('decrementEventPath', async (ctx) => {
    const number = ctx.event.data.value;
    const getResult = await integration.storage.getData(ctx, storageKey);
    await integration.storage.setData(ctx, storageKey, {
      count: getResult.data.count - number,
    });
  });

  // @ts-ignore
  router.get('counterPath', async (ctx) => {
    ctx.body = (await integration.storage.getData(ctx, storageKey)).data;
  });

  // @ts-ignore
  router.put('resetCountPath', async (ctx) => {
    ctx.body = await integration.storage.setData(ctx, storageKey, {
      count: 0,
    });
  });

  module.exports = integration;
};

const getTestConnectorFile = () => {
  const { Connector } = require('@fusebit-int/framework');

  const connector = new Connector();

  connector.service.setGetEventAuthId(() => {
    return 'authId';
  });

  // @ts-ignore
  connector.service.setGetWebhookEventType((ctx) => {
    return ctx.req.body.action;
  });

  // @ts-ignore
  connector.service.setCreateWebhookResponse(async (ctx, processPromise) => {
    await processPromise;
    ctx.body = {
      status: 'success',
      message: 'Webhook Processed',
    };
  });

  connector.service.setValidateWebhookEvent(() => true);
  connector.service.setInitializationChallenge(() => false);

  // @ts-ignore
  connector.router.get('/api/test', (ctx) => (ctx.body = { test: 'this' }));

  module.exports = connector;
};

const connectorEntity = {
  data: {
    handler: './connector',
    files: {
      ['package.json']: JSON.stringify({
        scripts: {},
        dependencies: {
          ['@fusebit-int/framework']: FrameworkVersion,
        },
        files: ['./connector.js'],
        engines: {
          node: '14',
        },
      }),
      ['connector.js']: createTestFile(getTestConnectorFile, { authId }),
    },
  },
  tags: {
    [sharedTag]: null,
  },
  id: connectorId,
};

const integrationEntity = {
  data: {
    handler: './integrationTest',
    files: {
      ['package.json']: JSON.stringify({
        scripts: {},
        dependencies: {
          ['@fusebit-int/framework']: FrameworkVersion,
        },
        files: ['./integrationTest.js'],
        engines: {
          node: '14',
        },
      }),
      ['integrationTest.js']: createTestFile(getTestIntegrationFile, {
        incrementEventPath,
        decrementEventPath,
        counterPath,
        resetCountPath,
      }),
    },
    components: [
      {
        name: connectorName,
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
};

const getCounter = async () => {
  return await ApiRequestMap.integration.dispatch(account, integrationId, RequestMethod.get, counterPath);
};
const resetCounter = async () => {
  return await ApiRequestMap.integration.dispatch(account, integrationId, RequestMethod.put, resetCountPath);
};

const incrementCounter = async (number: number) => {
  return await ApiRequestMap.connector.dispatch(
    account,
    connectorId,
    RequestMethod.post,
    '/api/fusebit_webhook_event',
    {
      body: {
        action: incrementEventName,
        value: number,
      },
    }
  );
};

const decrementCounter = async (number: number) => {
  return await ApiRequestMap.connector.dispatch(
    account,
    connectorId,
    RequestMethod.post,
    '/api/fusebit_webhook_event',
    {
      body: {
        action: decrementEventName,
        value: number,
      },
    }
  );
};
const testDispatch = async () => {
  return await ApiRequestMap.connector.dispatch(account, connectorId, RequestMethod.get, '/api/test');
};

describe('Connector webhook test suite', () => {
  test('Connector created with supported node.js version 14', async () => {
    let localCounter = 0;

    const healthResponse = await ApiRequestMap.integration.dispatch(
      account,
      integrationId,
      RequestMethod.get,
      '/api/health'
    );
    const testResponse = await testDispatch();
    expect(testResponse).toBeHttp({
      statusCode: 200,
      data: {
        test: 'this',
      },
    });

    const verifyCounterState = async (count: number) => {
      const retries = 3;
      for (let i = 0; i < retries; i++) {
        try {
          let counterResponse = await getCounter();
          expect(counterResponse).toBeHttp({ statusCode: 200, data: { count } });
          return;
        } catch (e) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      let counterResponse = await getCounter();
      expect(counterResponse).toBeHttp({ statusCode: 200, data: { count } });
    };
    const incrementBy = async (increment: number) => {
      const incrementResponse = await incrementCounter(increment);
      expect(incrementResponse).toBeHttp({
        statusCode: 200,
        data: { status: 'success', message: 'Webhook Processed' },
      });
      localCounter += increment;
    };
    const decrementBy = async (decrement: number) => {
      const decrementResponse = await decrementCounter(decrement);
      expect(decrementResponse).toBeHttp({
        statusCode: 200,
        data: { status: 'success', message: 'Webhook Processed' },
      });
      localCounter -= decrement;
    };

    await verifyCounterState(localCounter);
    await incrementBy(1);
    await verifyCounterState(localCounter);
    await incrementBy(10);
    await verifyCounterState(localCounter);
    await decrementBy(4);
    await verifyCounterState(localCounter);
    await incrementBy(5);
    await verifyCounterState(localCounter);
    await decrementBy(6);
    expect(localCounter).toBe(6);
  }, 180000);
});
