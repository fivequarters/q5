import { request } from '@5qtrs/request';

import { cleanupEntities, ApiRequestMap } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterAll(async () => {
  // await cleanupEntities(account);
}, 30000);

const demoRedirectUrl = 'http://monkey';

const createPair = async (integConfig?: any) => {
  const integId = `${boundaryId}-integ`;
  const conId = `${boundaryId}-con`;

  let response = await ApiRequestMap.integration.postAndWait(account, {
    id: integId,
    data: {
      configuration: {
        connectors: {
          conn: {
            package: '@fusebit-int/pkg-oauth-integration',
            connector: conId,
          },
        },
        ...integConfig,
      },
    },
  });
  expect(response).toBeHttp({ statusCode: 200 });
  const integ = response.data;

  response = await ApiRequestMap.connector.postAndWait(account, { id: conId });
  expect(response).toBeHttp({ statusCode: 200 });
  const conn = response.data;

  return { connectorId: conn.id, integrationId: integ.id };
};

describe('Sessions', () => {
  test('Creating a session on a missing integration returns 404', async () => {
    const response = await ApiRequestMap.integration.session.post(account, 'foobarbah', {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('Creating a session on an existing integration returns 200', async () => {
    const { integrationId, connectorId } = await createPair();
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        data: {
          meta: {
            redirectUrl: demoRedirectUrl,
          },
          mode: 'step',
          steps: [
            {
              target: {
                type: 'connector',
                entityId: connectorId,
                accountId: account.accountId,
                subscriptionId: account.subscriptionId,
              },
              stepName: 'connector:conn',
            },
          ],
        },
      },
    });
  }, 180000);

  test('Creating a session on an existing connector returns 200', async () => {
    const { integrationId } = await createPair();
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Creating a session with no redirectUrl fails', async () => {
    const { integrationId } = await createPair();
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {});
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Getting the session does not return output object', async () => {
    const { integrationId } = await createPair();
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });

    // Write data so there's something in the output
    response = await ApiRequestMap.integration.session.put(account, integrationId, response.data.id, {
      monkey: 'banana',
    });
    expect(response).toBeHttp({ statusCode: 200, has: ['id'], hasNot: ['output'] });

    response = await ApiRequestMap.integration.session.get(account, integrationId, response.data.id);
    expect(response).toBeHttp({ statusCode: 200, has: ['id'], hasNot: ['output'] });
  }, 180000);

  test('Full result session returns output object', async () => {
    const { integrationId } = await createPair();
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });

    // Write data so there's something in the output
    response = await ApiRequestMap.integration.session.put(account, integrationId, response.data.id, {
      monkey: 'banana',
    });
    expect(response).toBeHttp({ statusCode: 200, has: ['id'], hasNot: ['output'] });

    response = await ApiRequestMap.integration.session.getResult(account, integrationId, response.data.id);
    expect(response).toBeHttp({
      statusCode: 200,
      has: ['id'],
      data: { output: { monkey: 'banana' } },
    });
  }, 180000);

  test('Accessing a session id on a different entity returns 404', async () => {
    const { integrationId, connectorId } = await createPair();
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.connector.session.get(account, connectorId, response.data.id);
    expect(response).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('POST integration with an input value in the request', async () => {
    const { integrationId, connectorId } = await createPair();
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      input: { 'connector:conn': { iguana: 'mango' } },
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        data: {
          meta: {
            redirectUrl: demoRedirectUrl,
          },
          mode: 'step',
          steps: [
            {
              stepName: 'connector:conn',
              target: {
                type: 'connector',
                entityId: connectorId,
                accountId: account.accountId,
                subscriptionId: account.subscriptionId,
              },
              input: {
                iguana: 'mango',
              },
            },
          ],
        },
      },
    });
  }, 180000);

  test.skip('GETting the step session includes a supplied input object', async () => {
    // foo
    const { integrationId } = await createPair();
    /* XXX XXX XXX create a step session here. */
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      input: { 'connector:conn': { iguana: 'mango' } },
    });
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.session.put(account, integrationId, response.data.id, {
      monkey: 'banana',
    });
    expect(response).toBeHttp({ statusCode: 200, has: ['id'], hasNot: ['output'] });

    response = await ApiRequestMap.integration.session.get(account, integrationId, response.data.id);
    expect(response).toBeHttp({
      statusCode: 200,
      has: ['id'],
      hasNot: ['output'],
      data: {
        input: {
          iguana: 'mango',
        },
      },
    });
  }, 180000);

  test('Specified inputs for unknown steps are ignored', async () => {
    const { integrationId } = await createPair({
      creation: {
        steps: {
          'connector:lizard': { stepName: 'connector:lizard', target: { type: 'connector', entityId: 'lizard' } },
        },
      },
    });

    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      input: { 'connector:conn': { iguana: 'mango' } },
    });
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Create a session on an integration with a creation steplist', async () => {
    const { integrationId } = await createPair({
      creation: {
        steps: {
          'connector:lizard': { stepName: 'connector:lizard', target: { type: 'connector', entityId: 'lizard' } },
        },
      },
    });

    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      input: { 'connector:lizard': { iguana: 'mango' } },
    });
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.session.getResult(account, integrationId, response.data.id);
    expect(response).toBeHttp({
      statusCode: 200,
      has: ['id'],
      hasNot: ['output'],
      data: {
        steps: [
          {
            input: {
              iguana: 'mango',
            },
            target: {
              type: 'connector',
              entityId: 'lizard',
            },
            stepName: 'connector:lizard',
          },
        ],
      },
    });
  }, 180000);

  test('Create a session on an integration with target in the request', async () => {
    const { integrationId } = await createPair();

    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      stepName: 'connector:gecko',
      target: {
        type: 'connector',
        entityId: 'gecko',
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.session.getResult(account, integrationId, response.data.id);
    expect(response).toBeHttp({
      statusCode: 200,
      has: ['id'],
      hasNot: ['output'],
      data: {
        target: {
          type: 'connector',
          entityId: 'gecko',
        },
        stepName: 'connector:gecko',
      },
    });
  }, 180000);

  test('Start a session and get a 302 redirect with a new sessionId', async () => {
    // foo
    const { integrationId, connectorId } = await createPair();
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });
    const parentSessionId = response.data.id;

    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 302 });
    expect(
      response.headers.location.indexOf(
        `${process.env.API_SERVER}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/connector/${connectorId}/api/start?session=`
      )
    ).toBe(0);
    const location = new URL(response.headers.location);
    expect(location.searchParams.get('session')).not.toBe(parentSessionId);
  }, 180000);

  test('Create a session on an integration with steplist in the request', async () => {
    // foo
  }, 180000);
  test('Create a session on an integration with steplist in the request that fails DAG', async () => {
    // foo
  }, 180000);

  test('Full result session on a step includes output and no ids', async () => {
    // foo
  }, 180000);

  test('The input parameter in integration is found in step session', async () => {
    // foo
  }, 180000);
  test('The /callback endpoint of a step session redirects to the parent', async () => {
    // foo
  }, 180000);
  test('Finish a session and get a 302 redirect to final redirectUrl', async () => {
    // foo
  }, 180000);
  test('PUT writes to the output object of the session', async () => {
    // foo
  }, 180000);
  test('POSTing a session creates appropriate artifacts', async () => {
    // foo
  }, 180000);
  test('POSTing a session causes commit callback to be executed', async () => {
    // foo
  }, 180000);
  test('Commit callback failure is recorded in operation', async () => {
    // foo
  }, 180000);
  test('Validate security permissions (various)', async () => {
    // foo
  }, 180000);
  test('Validate parameter validation (various)', async () => {
    // foo
  }, 180000);
});
