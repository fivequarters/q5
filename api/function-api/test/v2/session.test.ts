import { request } from '@5qtrs/request';

import { Model } from '@5qtrs/db';
import { cleanupEntities, ApiRequestMap, createPair, getElementsFromUrl } from './sdk';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

const demoRedirectUrl = 'http://monkey';

describe('Sessions', () => {
  test('Creating a session on a missing integration returns 404', async () => {
    const response = await ApiRequestMap.integration.session.post(account, 'invalid-integration', {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('Creating a session on an existing integration returns 200', async () => {
    const { integrationId, connectorId } = await createPair(account, boundaryId);
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        data: {
          redirectUrl: demoRedirectUrl,
          mode: 'trunk',
          components: [
            {
              name: 'conn',
              skip: false,
              dependsOn: [],
              entityType: 'connector',
              entityId: connectorId,
              path: '/api/configure',
            },
          ],
        },
      },
    });
  }, 180000);

  test('Creating a session on an existing connector returns 200', async () => {
    const { integrationId } = await createPair(account, boundaryId);
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });
  }, 180000);

  test('Creating a session with no redirectUrl fails', async () => {
    const { integrationId } = await createPair(account, boundaryId);
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {});
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Writing to the output of the parent session is rejected', async () => {
    const { integrationId } = await createPair(account, boundaryId);
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
    const { integrationId, connectorId } = await createPair(account, boundaryId);
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.connector.session.get(account, connectorId, response.data.id);
    expect(response).toBeHttp({ statusCode: 404 });
  }, 180000);

  test('POST integration with an input value in the request', async () => {
    const { integrationId, connectorId } = await createPair(account, boundaryId);
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      input: { conn: { iguana: 'mango' } },
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        data: {
          redirectUrl: demoRedirectUrl,
          mode: 'trunk',
          components: [
            {
              name: 'conn',
              skip: false,
              dependsOn: [],
              entityType: 'connector',
              entityId: connectorId,
              path: '/api/configure',
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
    const { integrationId, connectorId } = await createPair(account, boundaryId);

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

  test('Specified inputs for unknown components are ignored', async () => {
    const { integrationId } = await createPair(account, boundaryId);

    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      input: { 'connector:lizard': { iguana: 'mango' } },
    });
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Start a session and get a 302 redirect with a new sessionId', async () => {
    const { integrationId, connectorId } = await createPair(account, boundaryId);
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

  test('Repeatedly start a session and get the same session id', async () => {
    const { integrationId, connectorId } = await createPair(account, boundaryId);
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
    let location = new URL(response.headers.location);
    const lastSessionId = location.searchParams.get('session');

    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 302 });
    location = new URL(response.headers.location);
    expect(lastSessionId).toBe(location.searchParams.get('session'));
  }, 180000);

  test('Create a session on an integration with non-matching steplist', async () => {
    const { integrationId } = await createPair(account, boundaryId);
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      components: ['connector:monkey'],
    });
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('Full result session on a step includes output and no ids', async () => {
    // foo
    // The id's are hidden underneath the step parameters, no way for them ever to be leaked like that.
  }, 180000);

  test('Finish a session and get a 302 redirect to final redirectUrl', async () => {
    const { integrationId } = await createPair(account, boundaryId);
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
    const { integrationId, connectorId } = await createPair(account, boundaryId, undefined, undefined, numConnectors);
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

  test('Calling the callback for a previous session gives the same next session id', async () => {
    const numConnectors = 5;
    const { integrationId, connectorId } = await createPair(account, boundaryId, undefined, undefined, numConnectors);
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });

    // Start the session
    response = await ApiRequestMap.integration.session.start(account, integrationId, response.data.id);
    expect(response).toBeHttp({ statusCode: 302 });
    const loc = getElementsFromUrl(response.headers.location);
    expect(loc.entityId).toBe(connectorId);

    // Finish the first step, get the location of the next step
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);
    expect(response).toBeHttp({ statusCode: 302 });
    const nextLoc = getElementsFromUrl(response.headers.location);

    // Validate that the callback gives back the same session id each time
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);
    expect(response).toBeHttp({ statusCode: 302 });
    expect(nextLoc).toEqual(getElementsFromUrl(response.headers.location));

    // Once more, for good measure.
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);
    expect(response).toBeHttp({ statusCode: 302 });
    expect(nextLoc).toEqual(getElementsFromUrl(response.headers.location));
  }, 180000);

  test('Create a session on an integration with steplist in the request that fails DAG', async () => {
    const numConnectors = 5;
    const { integrationId } = await createPair(account, boundaryId, undefined, undefined, numConnectors);
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      components: ['conn1', 'conn4'], // order matters, as does missing components.
    });
    expect(response).toBeHttp({
      statusCode: 400,
      data: { message: "Ordering violation: 'uses' in 'conn4' for 'conn3' before declaration." },
    });
  }, 180000);

  test('Create a session that fails DAG due to order', async () => {
    const numConnectors = 5;
    const { integrationId } = await createPair(account, boundaryId, undefined, undefined, numConnectors);
    const response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      components: ['conn2', 'conn1'], // order matters, as does missing components.
    });
    expect(response).toBeHttp({
      statusCode: 400,
      data: { message: "Ordering violation: 'uses' in 'conn2' for 'conn1' before declaration." },
    });
  }, 180000);

  test('POSTing a integration session creates appropriate artifacts', async () => {
    const { integrationId, connectorId } = await createPair(account, boundaryId);
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
          entityId: integrationId,
          accountId: account.accountId,
          entityType: 'session',
          subscriptionId: account.subscriptionId,
        },
      },
    });
    expect(response).not.toHaveProperty('data.location.subordinateId');
    expect(response).not.toHaveProperty('data.payload');

    response = await ApiRequestMap.integration.session.getResult(account, integrationId, parentSessionId);
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        id: parentSessionId,
        output: {
          tags: {
            'session.master': parentSessionId,
          },
          accountId: account.accountId,
          entityType: Model.EntityType.instance,
          parentEntityId: integrationId,
          parentEntityType: Model.EntityType.integration,
          subscriptionId: account.subscriptionId,
        },
        components: [
          {
            name: 'conn',
            path: '/api/configure',
            entityId: connectorId,
            entityType: Model.EntityType.connector,
          },
        ],
      },
    });
    expect(response.data.output.entityId).toBeUUID();

    expect(response.data.components[0].childSessionId).toBeUUID();
    expect(response.data.components[0]).not.toHaveProperty('output');

    const instance = response.data.output;

    // Validate the instance is created
    response = await ApiRequestMap.instance.get(account, instance.parentEntityId, instance.entityId);
    expect(response).toBeHttp({ statusCode: 200, data: { tags: { 'session.master': parentSessionId } } });

    const identity = response.data.data.conn;

    // Validate the identity is created
    response = await ApiRequestMap.identity.get(account, identity.parentEntityId, identity.entityId);
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        data: {
          monkey: 'banana',
        },
        tags: { 'session.master': parentSessionId },
      },
    });
  }, 180000);

  test('Not specifying a path on an integration step errors', async () => {
    const integId = `${boundaryId}-integ`;
    const integEntity = {
      id: integId,
      data: {
        components: [{ name: 'form', entityType: 'integration', entityId: integId }],
        handler: './integration',
        files: { 'integration.js': '' },
      },
    };
    const response = await ApiRequestMap.integration.post(account, integEntity);
    expect(response).toBeHttp({ statusCode: 400, data: { message: 'data.components.0.path: "path" is required' } });
  }, 180000);

  test('Specifying a integration with integration components respects path', async () => {
    const integId = `${boundaryId}-integ`;
    const { integrationId } = await createPair(account, boundaryId, {
      components: [
        {
          name: 'form',
          entityType: Model.EntityType.integration,
          path: '/api/monkey',
          entityId: integId,
          dependsOn: [],
        },
      ],
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
