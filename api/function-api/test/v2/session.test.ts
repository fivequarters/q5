import { ApiRequestMap, getSession, postSession, putSession } from './sdk';

import { getEnv } from '../v1/setup';
import { ConnectorService, IntegrationService } from '../../src/routes/service';
import { EntityType, IConnector, IIntegration, ISessionConfig, SessionStepStatus } from '@5qtrs/db/libc/model';

const integrationService = new IntegrationService();
const connectorService = new ConnectorService();
let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const integrations: IIntegration[] = [];
const connectors: IConnector[] = [];

describe.skip('Sessions', () => {
  beforeEach(async () => {
    integrations.length = 0;
    connectors.length = 0;
    integrations.push(
      await integrationService.dao.createEntity({
        accountId: account.accountId,
        id: 'session_test_integration',
        subscriptionId: account.subscriptionId,
      })
    );
    connectors.push(
      await connectorService.dao.createEntity({
        accountId: account.accountId,
        id: 'session_test_connector_1',
        subscriptionId: account.subscriptionId,
      })
    );

    connectors.push(
      await connectorService.dao.createEntity({
        accountId: account.accountId,
        id: 'session_test_connector_2',
        subscriptionId: account.subscriptionId,
      })
    );
  });
  test('Test Simple Sessions', async () => {
    const integId = boundaryId; // Guaranteed not to conflict
    let response = await postSession(account, EntityType.integration, { entityId: integrations[0].id });
    expect(response).toBeHttp({ statusCode: 200, has: ['session'] });
    const sessionId = response.data.session;
    response = await getSession(account, 'integration', integId, sessionId);
    expect(response).toBeHttp({ statusCode: 200, data: { foo: 1 } });
    response = await putSession(account, 'integration', integId, sessionId, { foo: 9 });
    expect(response).toBeHttp({ statusCode: 200 });
    response = await getSession(account, 'integration', integId, sessionId);
    expect(response).toBeHttp({ statusCode: 200, data: { foo: 9 } });
  });

  const createIntegrationSession = async (config: ISessionConfig) => {
    const createSessionResponse = await ApiRequestMap.integration.session.post(account, config);
    expect(createSessionResponse).toBeHttp(200);
    expect(Object.keys(createSessionResponse.data)).toEqual(['sessionId']);
    return createSessionResponse;
  };

  test('Test Integration Session Creation', async () => {
    const redirectUrl = 'test redirect url';
    const steps = [
      {
        name: `${EntityType.connector}:${connectors[0].id}`,
        status: SessionStepStatus.TODO,
        config: { entityType: EntityType.connector, entityId: connectors[0].id, redirectUrl },
      },
    ];
    const createSessionResponse = await createIntegrationSession({
      entityId: integrations[0].id,
      entityType: EntityType.integration,
      steps,
      redirectUrl,
    });

    const getSessionResponse = await ApiRequestMap.integration.session.get(
      account,
      integrations[0].id,
      createSessionResponse.data.sessionId
    );
    expect(getSessionResponse).toBeHttp(200);
    expect(getSessionResponse.data.configuration.steps).toEqual(steps);
  });

  test('Test Navigate to Step', async () => {
    const redirectUrl = 'www.google.com';
    const steps = [
      {
        name: `${EntityType.connector}:${connectors[0].id}`,
        status: SessionStepStatus.TODO,
        config: { entityType: EntityType.connector, entityId: connectors[0].id },
      },
    ];
    const createSessionResponse = await createIntegrationSession({
      entityId: integrations[0].id,
      entityType: EntityType.integration,
      steps,
      redirectUrl,
    });

    // redirection works
    const nextSessionResponse = await ApiRequestMap.integration.session.getNext(
      account,
      integrations[0].id,
      createSessionResponse.data.sessionId
    );
    expect(nextSessionResponse).toBeHttp(302);
    const redirectedUrlArray = nextSessionResponse.request.url.split('/');
    const subSessionId = redirectedUrlArray.pop(); // removing session id from url, as it is generated magically and is not known
    const redirectedUrl = redirectedUrlArray.join('/');
    expect(redirectedUrl).toEqual(
      `${account.baseUrl}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/${EntityType.connector}/${connectors[0].id}/session`
    );

    // verify that callback url correclty points to parent
    const childSessionResponse = await ApiRequestMap.connector.session.get(account, connectors[0].id, subSessionId);
    expect(childSessionResponse).toBeHttp(200);
    expect(childSessionResponse.data.redirectUrl).toEqual(
      `${account.baseUrl}/v2/account/${account.accountId}/subscription/${account.subscriptionId}/${EntityType.integration}/${integrations[0].id}/session/${createSessionResponse}/callback`
    );

    // step status updated to `in_progress` once the child session is created
    const parentSessionResponse = await ApiRequestMap.integration.session.get(
      account,
      integrations[0].id,
      createSessionResponse.data.sessionId
    );
    expect(parentSessionResponse).toBeHttp(200);
    expect(parentSessionResponse.data.configuration.steps[0].status).toEqual(SessionStepStatus.IN_PROGRESS);

    // Hit callback with encoded step id
    const callbackResponse = await ApiRequestMap.integration.session.callback(
      account,
      integrations[0].id,
      createSessionResponse.data.id,
      subSessionId
    );
    expect(callbackResponse).toBeHttp(302);
    expect(callbackResponse.request.url).toEqual(redirectUrl);

    // verify that step is marked complete
    const parentSessionResponseComplete = await ApiRequestMap.integration.session.get(
      account,
      integrations[0].id,
      createSessionResponse.data.sessionId
    );
    expect(parentSessionResponseComplete).toBeHttp(200);
    expect(parentSessionResponseComplete.data.configuration.steps[0].status).toEqual(SessionStepStatus.COMPLETE);
  });

  test('Delegate to Integration', async () => {
    const redirectUrl = 'test redirect url';
    const steps = [
      {
        name: `${EntityType.integration}:internal_endpoint_signature}`,
        status: SessionStepStatus.TODO,
        config: { entityType: EntityType.integration, entityId: integrations[0].id },
      },
    ];
    const createSessionResponse = await createIntegrationSession({
      entityId: integrations[0].id,
      entityType: EntityType.integration,
      steps,
      redirectUrl,
    });
    const nextSessionResponse = await ApiRequestMap.integration.session.getNext(
      account,
      integrations[0].id,
      createSessionResponse.data.sessionId
    );
    expect(nextSessionResponse).toBeHttp(418);
  });
});
