import { Model } from '@5qtrs/db';
import { cleanupEntities, ApiRequestMap, RequestMethod, createTestFile } from './sdk';
import { waitForTask } from '../v1/sdk';
import { getEnv } from '../v1/setup';

// Pull from function.utils so that keyStore.shutdown() and terminate_garbage_collection() get run, otherwise
// the jest process hangs.
import { defaultFrameworkSemver } from '../v1/function.utils';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 180000);

const getSimpleIntegration = (): Model.ISdkEntity & { data: Model.IIntegrationData } => ({
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

const getTaskedIntegration = (): Model.ISdkEntity & { data: Model.IIntegrationData } => {
  const i = getSimpleIntegration();
  i.data.files['integration.js'] = createTestFile(() => {
    const { Integration } = require('@fusebit-int/framework');

    const integration = new Integration();

    // @ts-ignore:next-line
    integration.task.on('/api/task', (ctx) => (ctx.body = 'hello'));

    integration.router.get(
      '/api/schedule',
      // @ts-ignore:next-line
      async (ctx) => (ctx.body = await integration.service.scheduleTask(ctx, { path: '/api/task' }))
    );

    integration.task.on(
      '/api/task2',
      // @ts-ignore:next-line
      async (ctx) => (ctx.body = ctx.state.params.functionAccessToken)
    );

    integration.router.get(
      '/api/schedule2',
      // @ts-ignore:next-line
      async (ctx) => (ctx.body = await integration.service.scheduleTask(ctx, { path: '/api/task2' }))
    );

    // @ts-ignore:next-line
    integration.task.on('/api/task3/:animal', (ctx) => (ctx.body = ctx.params.animal));

    module.exports = integration;
  });

  i.data.routes = [
    { path: '/api/task', task: {} },
    { path: '/api/task2', task: {} },
    { path: '/api/task3', task: {} },
  ];
  return i;
};

describe('Integration task', () => {
  test('Creating integration with an invalid spec returns 400', async () => {
    const integ = getSimpleIntegration();
    integ.data.routes = 'invalidroutes' as any;
    const response = await ApiRequestMap.integration.post(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Updating integration with an invalid spec errors', async () => {
    const integ = getSimpleIntegration();
    let response = await ApiRequestMap.integration.postAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });

    integ.data.routes = 'invalidroutes' as any;
    response = await ApiRequestMap.integration.put(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Creating integration with an valid route succeeds', async () => {
    const integ = getTaskedIntegration();

    const response = await ApiRequestMap.integration.postAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Invoking route on an integration succeeds', async () => {
    const integ = getTaskedIntegration();

    let response = await ApiRequestMap.integration.postAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.dispatch(account, integ.id, RequestMethod.post, '/api/task');
    expect(response).toBeHttp({ statusCode: 202 });
    const taskResult = await waitForTask(account, 'integration', integ.id, response.data.location);
    expect(taskResult.output.response.body).toEqual('hello');
  }, 180000);

  test('Invoking subroute on an integration succeeds', async () => {
    const integ = getTaskedIntegration();

    let response = await ApiRequestMap.integration.postAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.dispatch(account, integ.id, RequestMethod.post, '/api/task3/monkey');
    expect(response).toBeHttp({ statusCode: 202 });
    const taskResult = await waitForTask(account, 'integration', integ.id, response.data.location);
    expect(taskResult.output.response.body).toEqual('monkey');
  }, 180000);

  test('Invoking delayed route on an integration succeeds', async () => {
    const integ = getTaskedIntegration();

    let response = await ApiRequestMap.integration.postAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });

    const delaySeconds = 5;
    const notBefore = Math.floor(Date.now() / 1000) + delaySeconds;
    const notBeforeDate = new Date(notBefore * 1000);

    response = await ApiRequestMap.integration.dispatch(account, integ.id, RequestMethod.post, '/api/task', {
      headers: { 'fusebit-task-not-before': notBefore.toString() },
    });
    expect(response).toBeHttp({ statusCode: 202 });
    const taskResult = await waitForTask(account, 'integration', integ.id, response.data.location);
    expect(Number(new Date())).toBeGreaterThan(Number(notBeforeDate));
    expect(taskResult.output.response.body).toEqual('hello');
  }, 180000);

  test('Integration can self-schedule tasks', async () => {
    const integ = getTaskedIntegration();

    let response = await ApiRequestMap.integration.postAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.dispatch(account, integ.id, RequestMethod.get, '/api/schedule');
    expect(response).toBeHttp({ statusCode: 200 });
    const taskResult = await waitForTask(account, 'integration', integ.id, response.data);
    expect(taskResult.output.response.body).toEqual('hello');
  }, 180000);

  test('Integration can self-schedule tasks after being modified', async () => {
    const integ = getTaskedIntegration();

    let response = await ApiRequestMap.integration.postAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });

    // Add a new route just to mix things up
    integ.data.routes.push({ path: `/api/task_${integ.id}`, task: {} });
    response = await ApiRequestMap.integration.putAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.dispatch(account, integ.id, RequestMethod.get, '/api/schedule');
    expect(response).toBeHttp({ statusCode: 200 });
    const taskResult = await waitForTask(account, 'integration', integ.id, response.data);
    expect(taskResult.output.response.body).toEqual('hello');
  }, 180000);

  test('Task requires valid authz token', async () => {
    const integ = getTaskedIntegration();

    let response = await ApiRequestMap.integration.postAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.dispatch(account, integ.id, RequestMethod.post, '/api/task', {
      authz: '',
    });
    expect(response).toBeHttp({ statusCode: 403 });
  }, 180000);

  test('Integration tasks can self-schedule tasks', async () => {
    const integ = getTaskedIntegration();

    let response = await ApiRequestMap.integration.postAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.dispatch(account, integ.id, RequestMethod.get, '/api/schedule2');
    expect(response).toBeHttp({ statusCode: 200 });
    // First task
    const taskResult = await waitForTask(account, 'integration', integ.id, response.data);
    // ... returns the functionAccessToken, which is used to start another task
    response = await ApiRequestMap.integration.dispatch(account, integ.id, RequestMethod.post, '/api/task', {
      authz: taskResult.output.response.body,
    });
    const taskResult2 = await waitForTask(account, 'integration', integ.id, response.data.location);
    // ... returns 'hello'.
    expect(taskResult2.output.response.body).toEqual('hello');
  }, 180000);
});
