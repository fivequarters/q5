import { IHttpResponse, request } from '@5qtrs/request';

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
  test('POSTing an invalid redirectUrl results in an error', async () => {
    // Create multiple connectors to ensure the early-abort code is exercised
    const { integrationId, connectorId } = await createPair(account, boundaryId, undefined, undefined, 3);
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: '/foobar',
    });
    expect(response).toBeHttp({ statusCode: 400 });

    response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: 'example.com/foobar',
    });
    expect(response).toBeHttp({ statusCode: 400 });

    response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: 'git://example.com/foobar',
    });
    expect(response).toBeHttp({ statusCode: 400 });
  }, 180000);

  test('POSTing an error on a connector session is reported during commit', async () => {
    // Create multiple connectors to ensure the early-abort code is exercised
    const { integrationId, connectorId } = await createPair(account, boundaryId, undefined, undefined, 3);
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });

    const parentSessionId = response.data.id;

    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 302 });
    const location = new URL(response.headers.location);
    const stepSessionId = location.searchParams.get('session') as string;

    // Test failure of this step
    response = await ApiRequestMap.connector.session.put(account, connectorId, stepSessionId, {
      output: {
        error: 'bad_monkey',
        errorDescription: 'worst',
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });

    // Expect to be sent back to the parentSessionId, not to the next connector
    response = await ApiRequestMap.connector.session.callback(account, connectorId, stepSessionId);
    expect(response).toBeHttp({
      statusCode: 302,
      headers: { location: `${demoRedirectUrl}/?error=bad_monkey&errorDescription=worst&session=${parentSessionId}` },
    });

    // Post and check the session to see that the result is an error, generates "Missing child session id"
    // warnings in function-api that probably need to be squelched at some point
    response = await ApiRequestMap.integration.session.commitSession(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data.message).toMatch(/bad_monkey/);
  }, 180000);

  test('POSTing an error on an integration session is reported during commit', async () => {
    const { integrationId } = await createPair(
      account,
      boundaryId,
      {
        components: [
          {
            name: 'form',
            entityType: Model.EntityType.integration,
            entityId: `${boundaryId}-integ`,
            path: '/api/authorize',
            dependsOn: [],
          },
        ],
      },
      undefined,
      3
    );

    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: demoRedirectUrl,
    });
    const parentSessionId = response.data.id;

    // Start the session to make sure it starts correctly.
    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    const location = new URL(response.headers.location);
    const stepSessionId = location.searchParams.get('session') as string;

    // Validate that this is a form session
    response = await ApiRequestMap.integration.session.get(account, integrationId, stepSessionId);
    expect(response).toBeHttp({ statusCode: 200 });

    // Test failure of this step
    response = await ApiRequestMap.integration.session.put(account, integrationId, stepSessionId, {
      output: {
        error: 'bad_monkey',
        errorDescription: 'worst',
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });

    // Expect to be sent back to the parentSessionId, not to the next connector
    response = await ApiRequestMap.integration.session.callback(account, integrationId, stepSessionId);
    expect(response).toBeHttp({
      statusCode: 302,
      headers: { location: `${demoRedirectUrl}/?error=bad_monkey&errorDescription=worst&session=${parentSessionId}` },
    });

    // Post and check the session to see that the result is an error
    response = await ApiRequestMap.integration.session.commitSession(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 400 });
    expect(response.data.message).toMatch(/bad_monkey/);
  }, 180000);
});
