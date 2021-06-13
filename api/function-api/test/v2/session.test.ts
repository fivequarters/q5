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

const createPair = async () => {
  let response = await ApiRequestMap.integration.postAndWait(account, { id: `${boundaryId}-integ` });
  expect(response).toBeHttp({ statusCode: 200 });
  const integ = response.data;

  response = await ApiRequestMap.connector.postAndWait(account, { id: `${boundaryId}-conn` });
  expect(response).toBeHttp({ statusCode: 200 });
  const conn = response.data;

  // Prime integration.
  integ.data.configuration.connectors = {
    conn: { package: '@fusebit-int/pkg-oauth-integration', connector: conn.id },
  };
  response = await ApiRequestMap.integration.putAndWait(account, integ.id, integ);
  expect(response).toBeHttp({ statusCode: 200 });

  return { connectorId: conn.id, integrationId: integ.id };
};

const demoRedirectUrl = 'http://monkey';

describe('Sessions', () => {
  test('Creating a session on a missing integration returns 404', async () => {
    const response = await ApiRequestMap.integration.session.post(account, 'foobarbah', {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('Creating a session on an existing integration returns 200', async () => {
    const { integrationId } = await createPair();
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
                entityId: 'conn',
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
    expect(response).toBeHttp({
      statusCode: 200,
    });
  }, 180000);
  test('On an integration with an input value in the request', async () => {
    // foo
  }, 180000);
  test('On an integration where the creation steplist exists', async () => {
    // foo
  }, 180000);
  test('On an integration with target in the request', async () => {
    // foo
  }, 180000);
  test('On an integration with steplist in the request', async () => {
    // foo
  }, 180000);
  test('On an integration with steplist in the request that fails DAG', async () => {
    // foo
  }, 180000);
  test('Specify an input parameter in the integration that propagates', async () => {
    // foo
  }, 180000);
  test('Start a session and get a 302 redirect with a new sessionId', async () => {
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
  test('Getting the session does not return output object', async () => {
    // foo
  }, 180000);
  test('Getting the full result session returns output object and step ids', async () => {
    // foo
  }, 180000);
  test('Getting the full result session on a step includes output and no ids', async () => {
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
