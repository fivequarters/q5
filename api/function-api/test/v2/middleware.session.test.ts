import { cleanupEntities, ApiRequestMap, createPair, RequestMethod, createTestFile, v2Request } from './sdk';
import { v2Permissions } from '@5qtrs/constants';

import { getEnv } from '../v1/setup';

let { account, boundaryId } = getEnv();
beforeEach(() => {
  ({ account, boundaryId } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 180000);

const getIntegration = () => {
  const { Integration } = require('@fusebit-int/framework');

  const integration = new Integration();

  integration.middleware.session(integration.router);
  module.exports = integration;
};

const getSimpleIntegration = (): any => ({
  id: `${boundaryId}-integ`,
  data: {
    components: [],
    componentTags: {},
    configuration: {},
    handler: './integration',
    files: {
      'integration.js': createTestFile(getIntegration),
    },
    security: {
      permissions: [
        {
          action: v2Permissions.addSession,
          resource: `/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/`,
        },
        {
          action: v2Permissions.commitSession,
          resource: `/account/{{accountId}}/subscription/{{subscriptionId}}/integration/{{functionId}}/`,
        },
      ],
    },
  },
});

describe('Middleware session test', () => {
  test('End to end test', async () => {
    const integrationEntity = getSimpleIntegration();
    const integrationId = integrationEntity.id;
    // Create an integration
    let response = await ApiRequestMap.integration.postAndWait(account, integrationId, integrationEntity);
    expect(response).toBeHttp({ statusCode: 200 });

    // Start the middleware session
    response = await ApiRequestMap.integration.dispatch(
      account,
      integrationId,
      RequestMethod.get,
      '/api/service/start',
      { maxRedirects: 0 }
    );
    expect(response).toBeHttp({ statusCode: 302 });
    const session = response.headers.location.match(/session\/([^\/]*)\/start/);
    expect(session).not.toBeNull();
    expect(session![1]).toMatch(/sid-[0-9a-f]{32}/);

    const sessionId = session![1];

    // Go to the session start url
    response = await v2Request(account, {
      rawUrl: true,
      uri: response.headers.location,
      method: RequestMethod.get,
      maxRedirects: 0,
    });
    expect(response).toBeHttp({ statusCode: 302 });

    // Automatically redirected to the /api/service/commit to finish the session
    expect(response.headers.location).toMatch(/\/api\/service\/commit\?session=sid-[0-9a-f]{32}/);
    response = await v2Request(account, {
      rawUrl: true,
      uri: response.headers.location,
      method: RequestMethod.get,
      maxRedirects: 0,
    });
    expect(response).toBeHttp({ statusCode: 302 });

    // And success - redirected to the /api/health endpoint for lack of a better target.
    expect(response.headers.location).toMatch(/\/api\/health\?install=ins-[0-9a-f]{32}\&tenant=.*/);
  }, 180000);

  test('Validate: fails healthcheck when lacking permissions', async () => {
    const integrationEntity = getSimpleIntegration();
    delete integrationEntity.data.security;
    const integrationId = integrationEntity.id;
    // Create an integration
    let response = await ApiRequestMap.integration.postAndWait(account, integrationId, integrationEntity);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await ApiRequestMap.integration.dispatch(account, integrationId, RequestMethod.get, '/api/health');
    expect(response).toBeHttp({ statusCode: 500 });
  }, 180000);
});
