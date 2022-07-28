import { request } from '@5qtrs/request';
import * as Constants from '@5qtrs/constants';

import { callFunction, waitForBuild, putFunction, waitForTask } from './sdk';

import { getEnv } from './setup';

const MaxLambdaClockSkew = 1000;

let { account, boundaryId, function1Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id } = getEnv());
});

const specFuncReturnCtx = {
  nodejs: { files: { 'index.js': 'module.exports = async (ctx) => { return { body: ctx }; };' } },
  security: {},
};

const specFuncLongRunning = {
  nodejs: {
    files: {
      'index.js': `module.exports = async (ctx) => { 
    await new Promise((r) => setTimeout(r, 400 * 1000)); // wait 400s
    return { body: ctx }; 
  };`,
    },
  },
  compute: {
    timeout: 500,
  },
  routes: [
    {
      path: '/task',
      security: {
        authentication: 'none',
      },
      task: {},
    },
  ],
};

const createFunctionFromSpec = async (spec: any) => {
  let response = await putFunction(account, boundaryId, function1Id, spec);
  expect(response).toBeHttp({ statusCode: [200, 201] });
  if (response.status === 201) {
    response = await waitForBuild(account, response.data, 10, 1000);
  }
  return response;
};

const createFunction = async (
  authentication: string | undefined,
  authorization: any[] | undefined,
  routes: any | undefined
) => {
  const spec = Constants.duplicate({}, specFuncReturnCtx);
  spec.security.authentication = authentication;
  spec.security.authorization = authorization;
  spec.routes = routes;
  return createFunctionFromSpec(spec);
};

const scheduleTask = async (
  url: string,
  token?: string,
  data?: any,
  headers?: any,
  expectedStatusCode?: number,
  expectedResponseBody?: any
) => {
  const response = await request({
    method: 'POST',
    headers: {
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    url,
    data,
  });
  expect(response).toBeHttp({
    statusCode: expectedStatusCode || 202,
    data: expectedResponseBody || {
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
      status: 'pending',
      transitions: {},
    },
  });
  if (!expectedResponseBody) {
    expect(response.data.taskId).toMatch(/^tsk-/);
    expect(response.headers['location']).toContain(response.data.taskId);
    expect(response.headers['location']).toMatch(response.data.location);
  }
  return response.data;
};

const runDelayedTest = async (delaySeconds: number) => {
  const createResponse = await createFunction(undefined, undefined, [
    {
      path: '/task',
      task: {},
    },
  ]);
  const requestBody = { foo: 'bar' };
  const notBefore = Math.floor(Date.now() / 1000) + delaySeconds;
  const notBeforeDate = new Date(notBefore * 1000);
  const requestHeaders = {
    'x-foo': 'x-bar',
    'fusebit-task-not-before': notBefore.toString(),
  };
  const scheduleResponse = await scheduleTask(
    createResponse.data.location + '/task?a=b',
    account.accessToken,
    requestBody,
    requestHeaders
  );
  const waitResponse = await waitForTask(account, boundaryId, function1Id, scheduleResponse.location);
  expect(waitResponse).toMatchObject({
    status: 'completed',
    notBefore: notBeforeDate.toISOString(),
    output: {
      response: {
        body: {
          body: requestBody,
          headers: {
            ...requestHeaders,
            'fusebit-task-id': scheduleResponse.taskId,
            'fusebit-task-route': '/task',
          },
          query: { a: 'b' },
        },
      },
    },
  });
  expect(waitResponse.output.response.body.headers['fusebit-trace-id']).toMatch(/\./);
  expect(+waitResponse.output.response.body.headers['fusebit-task-scheduled-at']).toBeLessThan(
    +waitResponse.output.response.body.headers['fusebit-task-executing-at']
  );
  const pendingDate = new Date(waitResponse.transitions.pending);
  const runningDate = new Date(waitResponse.transitions.running);
  const completedDate = new Date(waitResponse.transitions.completed);
  expect(isNaN(pendingDate.valueOf())).toBe(false);
  expect(isNaN(runningDate.valueOf())).toBe(false);
  expect(isNaN(completedDate.valueOf())).toBe(false);
  expect(pendingDate.valueOf()).toBeLessThan(runningDate.valueOf() + MaxLambdaClockSkew);
  expect(notBeforeDate.valueOf()).toBeLessThan(runningDate.valueOf() + MaxLambdaClockSkew);
  expect(runningDate.valueOf()).toBeLessThan(completedDate.valueOf());
};

const runCustomHandlerTest = async (handler: any) => {
  const createResponse = await createFunctionFromSpec({
    nodejs: {
      files: {
        'index.js': `module.exports = ${handler.toString()};`,
      },
    },
    security: {
      authentication: 'none',
      functionPermissions: {
        allow: [
          {
            action: 'function:schedule',
            resource:
              '/account/{{accountId}}/subscription/{{subscriptionId}}/boundary/{{boundaryId}}/function/{{functionId}}/',
          },
        ],
      },
    },
    routes: [
      {
        path: '/task',
        task: {},
      },
    ],
  });
  const requestBody = { foo: 'bar' };
  const requestHeaders = { 'x-foo': 'x-bar' };
  const requestQuery = { a: 'b' };
  const scheduleResponse = await callFunction('ignored-token', createResponse.data.location);
  expect(scheduleResponse).toBeHttp({
    statusCode: 200,
    data: {
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      boundaryId,
      functionId: function1Id,
      status: 'pending',
      transitions: {},
    },
  });
  expect(scheduleResponse.data.taskId).toMatch(/^tsk-/);
  expect(scheduleResponse.data.location).toMatch(/^http/i);

  const waitResponse = await waitForTask(account, boundaryId, function1Id, scheduleResponse.data.location);
  expect(waitResponse).toMatchObject({
    status: 'completed',
    output: {
      response: {
        body: {
          body: requestBody,
          headers: {
            ...requestHeaders,
            'fusebit-task-id': scheduleResponse.data.taskId,
            'fusebit-task-route': '/task',
          },
          query: requestQuery,
        },
      },
    },
  });
  expect(waitResponse.output.response.body.headers['fusebit-trace-id']).toMatch(/\./);
  expect(+waitResponse.output.response.body.headers['fusebit-task-scheduled-at']).toBeLessThan(
    +waitResponse.output.response.body.headers['fusebit-task-executing-at']
  );
  const pendingDate = new Date(waitResponse.transitions.pending);
  const runningDate = new Date(waitResponse.transitions.running);
  const completedDate = new Date(waitResponse.transitions.completed);
  expect(isNaN(pendingDate.valueOf())).toBe(false);
  expect(isNaN(runningDate.valueOf())).toBe(false);
  expect(isNaN(completedDate.valueOf())).toBe(false);
  expect(pendingDate.valueOf()).toBeLessThan(runningDate.valueOf() + MaxLambdaClockSkew);
  expect(runningDate.valueOf()).toBeLessThan(completedDate.valueOf());
};

const runOneTask = async (location: string, responseObject?: any, attempts?: number) => {
  const requestBody = { foo: 'bar' };
  const requestHeaders = {
    'x-foo': 'x-bar',
  };
  const scheduleResponse = await scheduleTask(location + '/task?a=b', account.accessToken, requestBody, requestHeaders);
  const waitResponse = await waitForTask(account, boundaryId, function1Id, scheduleResponse.location, attempts || 60);
  expect(waitResponse).toMatchObject(
    responseObject || {
      status: 'completed',
      output: {
        response: {
          body: {
            body: requestBody,
            headers: {
              ...requestHeaders,
              'fusebit-task-id': scheduleResponse.taskId,
              'fusebit-task-route': '/task',
            },
            query: { a: 'b' },
          },
        },
      },
    }
  );
  expect(waitResponse.output.response.body.headers['fusebit-trace-id']).toMatch(/\./);
  expect(+waitResponse.output.response.body.headers['fusebit-task-scheduled-at']).toBeLessThan(
    +waitResponse.output.response.body.headers['fusebit-task-executing-at']
  );
  const pendingDate = new Date(waitResponse.transitions.pending);
  const runningDate = new Date(waitResponse.transitions.running);
  const completedDate = new Date(waitResponse.transitions.completed);
  expect(isNaN(pendingDate.valueOf())).toBe(false);
  expect(isNaN(runningDate.valueOf())).toBe(false);
  expect(isNaN(completedDate.valueOf())).toBe(false);
  expect(pendingDate.valueOf()).toBeLessThan(runningDate.valueOf() + MaxLambdaClockSkew);
  expect(runningDate.valueOf()).toBeLessThan(completedDate.valueOf());
};

describe('Tasks', () => {
  const endpoint = Constants.API_PUBLIC_ENDPOINT;

  test('Creating a function with a task scheduling route succeeds', async () => {
    await createFunction(undefined, undefined, [
      {
        path: '/task',
        task: {},
      },
    ]);
  }, 180000);

  test('Running a simple task succeeds', async () => {
    const createResponse = await createFunction(undefined, undefined, [
      {
        path: '/task',
        task: {},
      },
    ]);
    await runOneTask(createResponse.data.location);
  }, 180000);

  test('Running a 400s task succeeds', async () => {
    const createResponse = await createFunctionFromSpec(specFuncLongRunning);
    await runOneTask(createResponse.data.location, undefined, 430);
  }, 500000);

  test('Getting task statistics succeeds', async () => {
    await createFunction(undefined, undefined, [
      {
        path: '/t1',
        task: {},
      },
      {
        path: '/t2',
        task: {},
      },
      {
        path: '/t3',
      },
    ]);
    const url = `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${function1Id}?include=task`;
    const response = await request({
      method: 'GET',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
      },
      url,
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        routes: [
          {
            path: '/t1',
            task: {
              stats: {
                availableCount: 0,
                delayedCount: 0,
                pendingCount: 0,
              },
            },
          },
          {
            path: '/t2',
            task: {
              stats: {
                availableCount: 0,
                delayedCount: 0,
                pendingCount: 0,
              },
            },
          },
        ],
      },
    });
  }, 180000);

  test('Scheduling task more than 24h in advance fails', async () => {
    let response = await createFunction(undefined, undefined, [
      {
        path: '/t1',
        task: {},
      },
    ]);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request({
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'fusebit-task-not-before': (Math.floor(Date.now() / 1000) + 25 * 3600).toString(),
      },
      url: response.data.location + '/t1',
      data: {},
    });
    expect(response).toBeHttp({
      statusCode: 400,
    });
  }, 180000);

  test('Running a simple task delayed <15s succeeds', async () => {
    await runDelayedTest(10);
  }, 180000);

  test('Running a simple task delayed >15s succeeds', async () => {
    await runDelayedTest(20);
  }, 180000);

  test('Running a simple task with ctx.fusebit.scheduleTask succeeds', async () => {
    // @ts-ignore
    const fusebitScheduleTask = async (ctx) =>
      ctx.method === 'TASK'
        ? { body: ctx }
        : {
            body: await ctx.fusebit.scheduleTask({
              path: '/task',
              body: { foo: 'bar' },
              query: { a: 'b' },
              headers: { 'x-foo': 'x-bar' },
            }),
          };
    await runCustomHandlerTest(fusebitScheduleTask);
  }, 180000);

  test('Running a relatively delayed task with ctx.fusebit.scheduleTask succeeds', async () => {
    // @ts-ignore
    const fusebitScheduleTask = async (ctx) =>
      ctx.method === 'TASK'
        ? { body: ctx }
        : {
            body: await ctx.fusebit.scheduleTask({
              path: '/task',
              body: { foo: 'bar' },
              query: { a: 'b' },
              headers: { 'x-foo': 'x-bar' },
              notBeforeRelative: 1,
            }),
          };
    await runCustomHandlerTest(fusebitScheduleTask);
  }, 180000);

  test('Running an absolutely delayed task with ctx.fusebit.scheduleTask succeeds', async () => {
    // @ts-ignore
    const fusebitScheduleTask = async (ctx) =>
      ctx.method === 'TASK'
        ? { body: ctx }
        : {
            body: await ctx.fusebit.scheduleTask({
              path: '/task',
              body: { foo: 'bar' },
              query: { a: 'b' },
              headers: { 'x-foo': 'x-bar' },
              notBefore: new Date(Date.now() + 1000),
            }),
          };
    await runCustomHandlerTest(fusebitScheduleTask);
  }, 180000);

  test('Running 50 tasks without maxRunning limit succeeds', async () => {
    const createResponse = await createFunction(undefined, undefined, [
      {
        path: '/task',
        task: {
          maxRunning: 0,
        },
      },
    ]);
    const plan = [];
    for (let i = 0; i < 50; i++) {
      plan.push(runOneTask(createResponse.data.location));
    }
    await Promise.all(plan);
  }, 180000);

  test('Running 50 tasks with maxRunning limit of 5 succeeds', async () => {
    // @ts-ignore
    const handler = async (ctx) => {
      try {
        const Superagent = require('superagent');
        const storageUrl = `${ctx.fusebit.endpoint}/v1/account/${ctx.accountId}/subscription/${ctx.subscriptionId}/storage/boundary/${ctx.boundaryId}/function/${ctx.functionId}`;
        // @ts-ignore
        const refcount = async (delta) => {
          while (true) {
            // Update refcount in storage while retrying on conflicts to maintain consistency
            let response = await Superagent.get(storageUrl).set(
              'Authorization',
              `Bearer ${ctx.fusebit.functionAccessToken}`
            );
            // @ts-ignore
            const { data, etag } = response.body;
            data.history.push({ current: data.current, max: data.max, taskId: ctx.headers['fusebit-task-id'], delta });
            data.current += delta;
            data.max = Math.max(data.max, data.current);
            response = await Superagent.put(storageUrl)
              .set('Authorization', `Bearer ${ctx.fusebit.functionAccessToken}`)
              .send({ data, etag })
              // @ts-ignore
              .ok((r) => r.status === 200 || r.status === 409);
            if (response.status === 200) return;
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 500)));
          }
        };
        await refcount(1);
        await new Promise((r) => setTimeout(r, 1000 + Math.floor(Math.random() * 1000)));
        await refcount(-1);
        return { status: 200, body: { ok: true, headers: ctx.headers } };
      } catch (e) {
        return {
          body: {
            // @ts-ignore
            error: e.stack,
            headers: ctx.headers,
            fusebit: ctx.fusebit,
          },
        };
      }
    };
    const createResponse = await createFunctionFromSpec({
      nodejs: {
        files: {
          'index.js': `module.exports = ${handler.toString()};`,
          'package.json': { dependencies: { superagent: '7.1.6' } },
        },
      },
      routes: [
        {
          path: '/task',
          task: {
            maxRunning: 5,
          },
          security: {
            authentication: 'none',
            functionPermissions: {
              allow: [
                {
                  action: 'storage:*',
                  resource:
                    '/account/{{accountId}}/subscription/{{subscriptionId}}/storage/boundary/{{boundaryId}}/function/{{functionId}}/',
                },
              ],
            },
          },
        },
      ],
    });
    const storageUrl = `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/storage/boundary/${boundaryId}/function/${function1Id}`;
    let response = await request({
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
      },
      url: storageUrl,
      data: {
        data: { current: 0, max: 0, history: [] },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    const plan = [];
    for (let i = 0; i < 50; i++) {
      plan.push(
        runOneTask(createResponse.data.location, {
          status: 'completed',
          output: {
            response: {
              status: 200,
              body: {
                ok: true,
              },
            },
          },
        })
      );
    }
    await Promise.all(plan);
    response = await request({
      method: 'GET',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
      },
      url: storageUrl,
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        data: {
          max: 5, // actual maximum concurrently running tasks
        },
      },
    });
  }, 180000);
});
