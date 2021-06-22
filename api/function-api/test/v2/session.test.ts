import { request } from '@5qtrs/request';

import { Model } from '@5qtrs/db';
import { cleanupEntities, ApiRequestMap } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterEach(async () => {
  await cleanupEntities(account);
}, 30000);

const demoRedirectUrl = 'http://monkey';

const createPair = async (integConfig?: any, numConnectors: number = 1) => {
  const integId = `${boundaryId}-integ`;
  const connName = 'conn';
  const conId = `${boundaryId}-con`;

  const conns: any = {};
  const steps: any = {
    [connName]: {
      stepName: connName,
      target: { entityType: 'connector', entityId: conId },
    },
  };

  for (let n = 1; n < numConnectors; n++) {
    conns[`${connName}${n}`] = { package: '@fusebit-int/pkg-oauth-integration', connector: `${conId}${n}` };
    steps[`${connName}${n}`] = {
      stepName: `${connName}${n}`,
      target: { entityType: 'connector', entityId: `${conId}${n}` },
      ...(n > 1 ? { uses: [`${connName}${n - 1}`] } : {}),
    };
  }

  const integEntity = {
    id: integId,
    data: {
      configuration: {
        connectors: {
          conn: {
            package: '@fusebit-int/pkg-oauth-integration',
            connector: conId,
          },
          ...conns,
        },
        ...(numConnectors > 1 ? { creation: { steps, autoStep: false } } : {}),
        ...integConfig,
      },

      handler: './integration',
      files: {
        ['integration.js']: [
          "const { Router, Manager, Form } = require('@fusebit-int/framework');",
          'const router = new Router();',
          "router.get('/api/', async (ctx) => { });",
          'module.exports = router;',
        ].join('\n'),
      },
    },
  };

  let response = await ApiRequestMap.integration.postAndWait(account, integEntity);
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.id).not.toMatch('/');
  const integ = response.data;

  response = await ApiRequestMap.connector.postAndWait(account, { id: conId });
  expect(response).toBeHttp({ statusCode: 200 });
  expect(response.data.id).not.toMatch('/');
  const conn = response.data;

  for (let n = 1; n < numConnectors; n++) {
    response = await ApiRequestMap.connector.postAndWait(account, { id: `${conId}${n}` });
    expect(response).toBeHttp({ statusCode: 200 });
  }

  return {
    connectorId: conn.id,
    integrationId: integ.id,
    steps: Object.keys(integEntity.data.configuration.connectors),
  };
};

const getElementsFromUrl = (url: string) => {
  const decomp = new URL(url);
  const comps = decomp.pathname.match(new RegExp('/v2/account/([^/]*)/subscription/([^/]*)/([^/]*)/([^/]*).*'));

  if (!comps) {
    throw new Error(`invalid url: ${decomp.pathname}`);
  }

  return {
    accountId: comps[1],
    subscriptionId: comps[2],
    entityType: comps[3],
    entityId: comps[4],
    sessionId: decomp.searchParams.get('session'),
  };
};

describe('Sessions', () => {
  test('Creating a session on a missing integration returns 404', async () => {
    const response = await ApiRequestMap.integration.session.post(account, 'invalid-integration', {
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
          mode: 'trunk',
          steps: [
            {
              target: {
                entityType: 'connector',
                entityId: connectorId,
                accountId: account.accountId,
                subscriptionId: account.subscriptionId,
                path: '/api/configure',
              },
              stepName: 'conn',
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

  test('Writing to the output of the parent session is rejected', async () => {
    const { integrationId } = await createPair();
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.id).not.toMatch('/');

    // Write data so there's something in the output
    response = await ApiRequestMap.integration.session.put(account, integrationId, response.data.id, {
      monkey: 'banana',
    });
    expect(response).toBeHttp({ statusCode: 400 });
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
      input: { conn: { iguana: 'mango' } },
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        data: {
          meta: {
            redirectUrl: demoRedirectUrl,
          },
          mode: 'trunk',
          steps: [
            {
              stepName: 'conn',
              target: {
                entityType: 'connector',
                entityId: connectorId,
                accountId: account.accountId,
                subscriptionId: account.subscriptionId,
                path: '/api/configure',
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

  test('GETting the step session includes a supplied input object', async () => {
    const { integrationId, connectorId } = await createPair();

    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      input: { conn: { iguana: 'mango' } },
    });
    expect(response).toBeHttp({ statusCode: 200 });

    const parentSessionId = response.data.id;

    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 302 });
    const location = new URL(response.headers.location);
    const stepSessionId = location.searchParams.get('session');

    response = await ApiRequestMap.connector.session.get(account, connectorId, stepSessionId);
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
    const { integrationId } = await createPair();

    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      input: { 'connector:lizard': { iguana: 'mango' } },
    });
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Create a session on an integration with a creation steplist', async () => {
    const { integrationId } = await createPair({
      creation: {
        steps: {
          'connector:lizard': { stepName: 'connector:lizard', target: { entityType: 'connector', entityId: 'lizard' } },
        },
        autoStep: false,
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
              entityType: 'connector',
              entityId: 'lizard',
              path: '/api/configure',
            },
            stepName: 'connector:lizard',
          },
        ],
      },
    });
  }, 180000);

  test('Start a session and get a 302 redirect with a new sessionId', async () => {
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
        `${process.env.API_SERVER}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/connector/${connectorId}/api/configure?session=`
      )
    ).toBe(0);
    const location = new URL(response.headers.location);
    expect(location.searchParams.get('session')).not.toBe(parentSessionId);
  }, 180000);

  test('Create a session on an integration with steplist in the request', async () => {
    const { integrationId, connectorId } = await createPair();
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      steps: ['conn'],
    });
    expect(response).toBeHttp({ statusCode: 200 });

    // Start the session to make sure it starts correctly.
    response = await ApiRequestMap.integration.session.start(account, integrationId, response.data.id);
    expect(response).toBeHttp({ statusCode: 302 });
    expect(
      response.headers.location.indexOf(
        `${process.env.API_SERVER}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/connector/${connectorId}/api/configure?session=`
      )
    ).toBe(0);
  }, 180000);

  test('Create a session on an integration with non-matching steplist', async () => {
    const { integrationId } = await createPair();
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      steps: ['connector:monkey'],
    });
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Full result session on a step includes output and no ids', async () => {
    // foo
    // The id's are hidden underneath the step parameters, no way for them ever to be leaked like that.
  }, 180000);

  test('Finish a session and get a 302 redirect to final redirectUrl', async () => {
    const { integrationId } = await createPair();
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });
    const parentSessionId = response.data.id;

    // Start the session to make sure it starts correctly.
    response = await ApiRequestMap.integration.session.start(account, integrationId, response.data.id);
    expect(response).toBeHttp({ statusCode: 302 });
    const loc = getElementsFromUrl(response.headers.location);

    // Call the callback
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);
    expect(response).toBeHttp({
      statusCode: 302,
      headers: { location: `${demoRedirectUrl}?session=${parentSessionId}` },
    });
  }, 180000);

  test('The /callback endpoint of a step session redirects to the next entry', async () => {
    const numConnectors = 5;
    const { integrationId, connectorId } = await createPair({}, numConnectors);
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });
    const parentSessionId = response.data.id;

    // Start the session
    response = await ApiRequestMap.integration.session.start(account, integrationId, response.data.id);
    expect(response).toBeHttp({ statusCode: 302 });
    let loc = getElementsFromUrl(response.headers.location);
    expect(loc.entityId).toBe(connectorId);

    for (let n = 1; n < numConnectors; n++) {
      // Call the next callback
      response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);
      expect(response).toBeHttp({ statusCode: 302 });
      loc = getElementsFromUrl(response.headers.location);
      expect(loc.entityId).toBe(`${connectorId}${n}`);
    }

    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);
    expect(response).toBeHttp({
      statusCode: 302,
      headers: { location: `${demoRedirectUrl}?session=${parentSessionId}` },
    });
  }, 180000);

  test('Create a session on an integration with steplist in the request that fails DAG', async () => {
    const numConnectors = 5;
    const { integrationId } = await createPair({}, numConnectors);
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      steps: ['conn1', 'conn4'], // order matters, as does missing steps.
    });
    expect(response).toBeHttp({
      statusCode: 400,
      data: { message: "Ordering violation: 'uses' in 'conn4' for 'conn3' before declaration." },
    });
  }, 180000);

  test('Create a session that fails DAG due to order', async () => {
    const numConnectors = 5;
    const { integrationId } = await createPair({}, numConnectors);
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      steps: ['conn2', 'conn1'], // order matters, as does missing steps.
    });
    expect(response).toBeHttp({
      statusCode: 400,
      data: { message: "Ordering violation: 'uses' in 'conn2' for 'conn1' before declaration." },
    });
  }, 180000);

  test('POSTing a integration session creates appropriate artifacts', async () => {
    const { integrationId } = await createPair();
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });
    const parentSessionId = response.data.id;

    response = await ApiRequestMap.integration.session.start(account, integrationId, response.data.id);
    expect(response).toBeHttp({ statusCode: 302 });
    const loc = getElementsFromUrl(response.headers.location);

    // Write data so there's something in the output
    response = await ApiRequestMap[loc.entityType].session.put(account, loc.entityId, loc.sessionId, {
      monkey: 'banana',
    });
    expect(response).toBeHttp({ statusCode: 200, hasNot: ['output'] });

    // Getting a session with data in it doesn't return the output.
    response = await ApiRequestMap[loc.entityType].session.get(account, loc.entityId, loc.sessionId);
    expect(response).toBeHttp({ statusCode: 200, hasNot: ['output'] });

    // Finish the session
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);
    expect(response).toBeHttp({ statusCode: 302 });

    // POST the parent session
    response = await ApiRequestMap.integration.session.postSession(account, integrationId, parentSessionId);

    // Returns the identity and instance id's.
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        code: 200,
        type: 'session',
        verb: 'creating',
        location: {
          componentId: integrationId,
          subordinateId: parentSessionId,
          accountId: account.accountId,
          entityType: 'session',
          subscriptionId: account.subscriptionId,
        },
      },
    });
    expect(Object.keys(response.data.payload)).toEqual(['', 'conn']);
    const identity = response.data.payload.conn;
    const instance = response.data.payload[''];
    expect(identity.id).not.toMatch('/');
    expect(instance.id).not.toMatch('/');
    expect(identity).not.toContain('output');
    expect(instance).not.toContain('output');

    // Validate the identity is created
    response = await ApiRequestMap.identity.get(account, identity.componentId, identity.id);
    expect(response).toBeHttp({ statusCode: 200 });

    // Future: Validate the identity has the appropriate tags

    // Validate the instance is created
    response = await ApiRequestMap.instance.get(account, instance.componentId, instance.id);
    expect(response).toBeHttp({ statusCode: 200 });

    // Future: Validate the instance has the appropriate tags
  }, 180000);

  test('Not specifying a path on an integration step errors', async () => {
    const integId = `${boundaryId}-integ`;
    const integEntity = {
      id: integId,
      data: {
        configuration: {
          creation: {
            steps: {
              form: { stepName: 'form', target: { entityType: 'integration', entityId: integId } },
            },
            autoStep: false,
          },
        },
        handler: './integration',
        files: { 'integration.js': '' },
      },
    };
    const response = await ApiRequestMap.integration.postAndWait(account, integEntity);
    expect(response).toBeHttp({ statusCode: 400, data: { message: "Missing 'path' from step 'form'" } });
  }, 180000);

  test('Specifying a integration with integration steps respects path', async () => {
    const integId = `${boundaryId}-integ`;
    const { integrationId } = await createPair({
      creation: {
        steps: {
          form: { stepName: 'form', target: { entityType: 'integration', path: '/api/monkey', entityId: integId } },
        },
        autoStep: false,
      },
    });
    expect(integrationId).toEqual(integId);

    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.session.start(account, integrationId, response.data.id);
    expect(response).toBeHttp({ statusCode: 302 });
    expect(
      response.headers.location.indexOf(
        `${process.env.API_SERVER}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/integration/${integrationId}/api/monkey?session=`
      )
    ).toBe(0);
  }, 180000);

  test('Validate security permissions (various)', async () => {
    // foo
  }, 180000);
  test('Validate parameter validation (various)', async () => {
    // foo
  }, 180000);
  test('Validate tags application (various)', async () => {
    // foo
  }, 180000);
});
