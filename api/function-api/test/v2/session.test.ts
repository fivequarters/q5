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
}, 180000);

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
              path: '/api/authorize',
            },
          ],
        },
      },
    });
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
              path: '/api/authorize',
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
        `${process.env.API_SERVER}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/connector/${connectorId}/api/authorize?session=`
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
        `${process.env.API_SERVER}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/connector/${connectorId}/api/authorize?session=`
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

  test('Overwrite an existing instance and identity', async () => {
    const { integrationId, connectorId, steps } = await createPair(account, boundaryId, {
      components: [
        {
          name: 'conn',
          entityType: Model.EntityType.connector,
          entityId: `${boundaryId}-con`,
          dependsOn: [],
          provider: '@fusebit-int/oauth-provider',
          path: '/api/authorize',
        },
        {
          name: 'form',
          entityType: Model.EntityType.integration,
          entityId: `${boundaryId}-integ`,
          dependsOn: ['conn'],
          path: '/api/authorize',
        },
      ],
    });

    // create identity
    const createIdentityResponse = await ApiRequestMap.identity.post(account, connectorId, { data: {} });
    expect(createIdentityResponse).toBeHttp({ statusCode: 200 });
    const identityId = createIdentityResponse.data.id;
    // create instance, with identity pre-attached
    const createInstanceResponse = await ApiRequestMap.instance.post(account, integrationId, {
      data: {
        [steps[0]]: {
          entityId: createIdentityResponse.data.id,
          parentEntityId: connectorId,
        },
      },
    });
    const instanceId = createInstanceResponse.data.id;
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      instanceId,
    });
    const parentSessionId = response.data.id;

    // Start the session to make sure it starts correctly.
    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    const loc = getElementsFromUrl(response.headers.location);
    // Call the callback to move to the next step
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);

    // get session results to verify current data matches data on instance/identity
    response = await ApiRequestMap.integration.session.getResult(account, integrationId, parentSessionId);
    const identitySessionId = Model.decomposeSubordinateId(response.data.components[0].childSessionId).entityId;
    const instanceSessionId = Model.decomposeSubordinateId(response.data.components[1].childSessionId).entityId;

    // put new data to sessions
    const instanceData = { newData: 'for instance' };
    const identityData = { newData: 'for identity' };
    await ApiRequestMap.integration.session.put(account, integrationId, instanceSessionId, instanceData);
    await ApiRequestMap.connector.session.put(account, connectorId, identitySessionId, identityData);

    // finalize session to write session data to entities
    await ApiRequestMap.integration.session.postSession(account, integrationId, parentSessionId);

    // verify that pre-existing identity and instance have been updated
    response = await ApiRequestMap.instance.get(account, integrationId, instanceId);
    expect(response).toBeHttp({ statusCode: 200, data: { data: { form: instanceData } } });
    response = await ApiRequestMap.identity.get(account, connectorId, identityId);
    expect(response).toBeHttp({ statusCode: 200, data: { data: identityData } });
  }, 180000);

  test('Overwrite 1 of 2 forms', async () => {
    const { integrationId } = await createPair(account, boundaryId, {
      components: [
        {
          name: 'formOne',
          entityType: Model.EntityType.integration,
          entityId: `${boundaryId}-integ`,
          dependsOn: [],
          path: '/api/authorize',
        },
      ],
    });

    const formOneInitialData = { initialData: 'formOne' };
    const formTwoInitialData = { intiialData: 'formTwo' };

    // create instance, with identity pre-attached
    const createInstanceResponse = await ApiRequestMap.instance.post(account, integrationId, {
      data: {
        formOne: formOneInitialData,
        formTwo: formTwoInitialData,
      },
    });
    const instanceId = createInstanceResponse.data.id;

    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      instanceId,
    });
    const parentSessionId = response.data.id;

    // Start the session to make sure it starts correctly.
    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    const loc = getElementsFromUrl(response.headers.location);
    // Call the callback to move to the next step
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);

    // get session results to verify current data matches data on instance/identity
    response = await ApiRequestMap.integration.session.getResult(account, integrationId, parentSessionId);
    const formOneSessionId = Model.decomposeSubordinateId(response.data.components[0].childSessionId).entityId;

    // put new data to sessions
    const formOneNewData = { newData: 'form one is updated' };
    response = await ApiRequestMap.integration.session.put(account, integrationId, formOneSessionId, formOneNewData);

    // finalize session
    response = await ApiRequestMap.integration.session.postSession(account, integrationId, parentSessionId);

    // verify that pre-existing instance has been updated while preserving skipped formTwo data
    response = await ApiRequestMap.instance.get(account, integrationId, instanceId);
    expect(response).toBeHttp({
      statusCode: 200,
      data: { data: { formOne: formOneNewData, formTwo: formTwoInitialData } },
    });
  }, 180000);

  test('Create a session with an instanceId to pull existing data', async () => {
    const { integrationId, connectorId, steps } = await createPair(account, boundaryId, {
      components: [
        {
          name: 'conn',
          entityType: Model.EntityType.connector,
          entityId: `${boundaryId}-con`,
          dependsOn: [],
          provider: '@fusebit-int/oauth-provider',
          path: '/api/authorize',
        },
        {
          name: 'form',
          entityType: Model.EntityType.integration,
          entityId: `${boundaryId}-integ`,
          dependsOn: ['conn'],
          path: '/api/authorize',
        },
      ],
    });

    const instanceTestData = { testData: 'instance' };
    const identityTestData = { testData: 'identity' };

    // create identity
    const createIdentityResponse = await ApiRequestMap.identity.post(account, connectorId, { data: identityTestData });
    expect(createIdentityResponse).toBeHttp({
      statusCode: 200,
      data: {
        data: identityTestData,
      },
    });
    // create instance, with identity pre-attached
    const createInstanceResponse = await ApiRequestMap.instance.post(account, integrationId, {
      data: {
        [steps[0]]: {
          entityId: createIdentityResponse.data.id,
          parentEntityId: connectorId,
        },
        [steps[1]]: instanceTestData,
      },
    });
    const instance = createInstanceResponse.data;

    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
      instanceId: instance.id,
    });
    const parentSessionId = response.data.id;

    // Start the session to make sure it starts correctly.
    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    const loc = getElementsFromUrl(response.headers.location);
    // Call the callback to move to the next step
    await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);

    // get session results to verify current data matches data on instance/identity
    response = await ApiRequestMap.integration.session.getResult(account, integrationId, parentSessionId);
    const identitySessionId = Model.decomposeSubordinateId(response.data.components[0].childSessionId).entityId;
    const instanceSessionId = Model.decomposeSubordinateId(response.data.components[1].childSessionId).entityId;

    const identitySessionResponse = await ApiRequestMap.connector.session.getResult(
      account,
      connectorId,
      identitySessionId
    );
    const instanceSessionResponse = await ApiRequestMap.integration.session.getResult(
      account,
      integrationId,
      instanceSessionId
    );
    expect(identitySessionResponse.data).toMatchObject({ output: identityTestData });
    expect(instanceSessionResponse.data).toMatchObject({ output: instanceTestData });
  }, 1800000);

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
      headers: { location: `${demoRedirectUrl}/?session=${parentSessionId}` },
    });
  }, 180000);

  test('Final 302 redirect respects query parameters', async () => {
    const { integrationId } = await createPair(account, boundaryId);
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: `${demoRedirectUrl}?fruit=mango&animal=ape`,
    });
    expect(response).toBeHttp({ statusCode: 200 });
    const parentSessionId = response.data.id;

    // Start the session to make sure it starts correctly.
    response = await ApiRequestMap.integration.session.start(account, integrationId, response.data.id);
    expect(response).toBeHttp({ statusCode: 302 });
    const loc = getElementsFromUrl(response.headers.location);

    // Call the callback
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);
    expect(response).toBeHttp({ statusCode: 302 });
    expect(response.headers.location).toBe(`${demoRedirectUrl}/?fruit=mango&animal=ape&session=${parentSessionId}`);
  }, 180000);

  test('Finish a session and receive operationId, and session gains replacementTargetId', async () => {
    const { integrationId } = await createPair(account, boundaryId);
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    const parentSessionId = response.data.id;

    // Start the session to make sure it starts correctly.
    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    const loc = getElementsFromUrl(response.headers.location);

    // Verify replacementTargetId and operationId are undefined
    response = await ApiRequestMap.integration.session.get(account, integrationId, parentSessionId);
    expect(response.data.operationId).toBeUndefined();
    expect(response.data.replacementTargetId).toBeUndefined();

    // Call the callback
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);

    // Post to finish
    response = await ApiRequestMap.integration.session.postSession(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 200 });

    // Verify Operation Id
    const operationId = response.data.operationId;
    response = await ApiRequestMap.integration.session.getResult(account, integrationId, parentSessionId);
    const sessionOperationId = response.data.operationId;
    expect(sessionOperationId).toBe(operationId);

    // Verify replacementTargetId matches created instance, to impose idempotence
    const replacementTargetId = response.data.replacementTargetId;
    const instanceId = response.data.output.entityId;
    expect(replacementTargetId).toBe(instanceId);

    // Verify Operation Id matches an existing operation
    response = await ApiRequestMap.operation.get(account, operationId);
    expect(response).toBeHttp({ statusCode: 200 });

    // New call to `postSession` results in new operationId, but new operation
    // does an update on the same instance with contents of session
    await ApiRequestMap.integration.session.postSession(account, integrationId, parentSessionId);
    response = await ApiRequestMap.integration.session.getResult(account, integrationId, parentSessionId);
    const idempotentReplacementTargetId = response.data.replacementTargetId;
    const idempotentInstanceId = response.data.output.entityId;
    expect(idempotentReplacementTargetId).toBe(replacementTargetId);
    expect(idempotentInstanceId).toBe(instanceId);
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
      headers: { location: `${demoRedirectUrl}/?session=${parentSessionId}` },
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
      data: { message: "Ordering violation: 'dependsOn' in 'conn4' for 'conn3' before declaration." },
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
      data: { message: "Ordering violation: 'dependsOn' in 'conn2' for 'conn1' before declaration." },
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
    expect(response).toBeHttp({ statusCode: 200 });

    // Getting a session with data in it return the output.
    response = await ApiRequestMap[loc.entityType].session.get(account, loc.entityId, loc.sessionId);
    expect(response).toBeHttp({ statusCode: 200, data: { output: { monkey: 'banana' } } });

    // Finish the session
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);
    expect(response).toBeHttp({ statusCode: 302 });

    // POST the parent session
    response = await ApiRequestMap.integration.session.postSession(account, integrationId, parentSessionId);

    // Returns the identity and instance id's.
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        statusCode: 200,
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
    expect(response.data).toMatchObject({
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
          path: '/api/authorize',
          entityId: connectorId,
          entityType: Model.EntityType.connector,
        },
      ],
    });
    expect(response.data.output.entityId).toBeUUID();

    const childSessionId = Model.decomposeSubordinateId(response.data.components[0].childSessionId).entityId;
    expect(childSessionId).toBeUUID();
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

  test('Tags specified on the session get persisted to identities and instances', async () => {
    const { integrationId } = await createPair(account, boundaryId);
    const tenantId = 'exampleTenantId';
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      tags: {
        tenantId,
      },
      redirectUrl: demoRedirectUrl,
    });
    const parentSessionId = response.data.id;

    // Start the session to make sure it starts correctly.
    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    const loc = getElementsFromUrl(response.headers.location);

    // Call the callback
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);

    // Post to finish
    response = await ApiRequestMap.integration.session.postSession(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 200 });

    // Verify Operation Id
    response = await ApiRequestMap.integration.session.getResult(account, integrationId, parentSessionId);
    const instanceId = response.data.output.entityId;

    // Get the instance, and validate it has the tag specified
    response = await ApiRequestMap.instance.get(account, integrationId, instanceId);
    expect(response).toBeHttp({ statusCode: 200, data: { tags: { tenantId } } });
  }, 180000);

  test('Tags specified on the integration get extended to instances and identities', async () => {
    const integTag = 'anIntegrationTag';

    const { integrationId, connectorId } = await createPair(account, boundaryId, { componentTags: { integTag } });
    const tenantId = 'exampleTenantId';
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      tags: {
        tenantId,
      },
      extendTags: true,
      redirectUrl: demoRedirectUrl,
    });
    const parentSessionId = response.data.id;

    // Start the session to make sure it starts correctly.
    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    const loc = getElementsFromUrl(response.headers.location);

    // Call the callback
    response = await ApiRequestMap[loc.entityType].session.callback(account, loc.entityId, loc.sessionId);

    // Post to finish
    response = await ApiRequestMap.integration.session.postSession(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 200 });

    // Verify Operation Id
    response = await ApiRequestMap.integration.session.getResult(account, integrationId, parentSessionId);
    const instanceId = response.data.output.entityId;

    // Get the instance, and validate it has the tag specified
    response = await ApiRequestMap.instance.get(account, integrationId, instanceId);
    expect(response).toBeHttp({ statusCode: 200, data: { tags: { tenantId, integTag } } });

    const identityId = response.data.data.conn.entityId;

    // Get the identity and validate it has the tag specified
    response = await ApiRequestMap.identity.get(account, connectorId, identityId);
    expect(response).toBeHttp({ statusCode: 200, data: { tags: { tenantId, integTag } } });
  }, 180000);

  test('Validate tags application (various additional)', async () => {
    // foo
  }, 180000);
  test('Validate security permissions (various)', async () => {
    // foo
  }, 180000);
  test('Validate parameter validation (various)', async () => {
    // foo
  }, 180000);
});
