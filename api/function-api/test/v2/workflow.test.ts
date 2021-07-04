import { request } from '@5qtrs/request';

import { Model } from '@5qtrs/db';

import { cleanupEntities, ApiRequestMap, createPair, getElementsFromUrl } from './sdk';

import { startTunnel, startHttpServer } from '../v1/tunnel';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

describe('Workflow', () => {
  let port = 0;
  let httpServer: any;
  let tunnel: any;
  let redirectUrl: string;

  beforeEach(async () => {
    httpServer = startHttpServer(port);
    httpServer.service = await httpServer.listen();
    port = httpServer.service.address().port;

    tunnel = await startTunnel(port);

    redirectUrl = `https://${tunnel.subdomain}.tunnel.dev.fusebit.io`;
  });

  afterEach(async () => {
    httpServer.service.close();
    tunnel.tunnel.close();
  });

  test('Create a connector and an integration and use a session', async () => {
    // Constants
    const authorizationUrl = `${redirectUrl}/authorize`;
    const tokenUrl = `${redirectUrl}/token`;
    const finalUrl = `${redirectUrl}/final`;
    const baseUrl = `${process.env.API_SERVER}/v2/account/${account.accountId}/subscription/${account.subscriptionId}`;

    const sampleToken = {
      access_token: 'EEEE',
      refresh_token: 'FFFF',
      token_type: 'access',
      message: boundaryId + '-token',
    };

    const state = 'CCCC';

    // Create the various artifacts
    const { integrationId, connectorId } = await createPair(
      account,
      boundaryId,
      {
        creation: {
          steps: [
            {
              name: 'conn1',
              target: { entityType: 'connector', entityId: `${boundaryId}-con` },
            },
            {
              name: 'form',
              target: { entityType: 'integration', path: '/api/aForm', entityId: '{{integration}}' },
              uses: ['conn1'],
            },
          ],
        },
      },
      {
        handler: '@fusebit-int/pkg-oauth-connector',
        configuration: {
          scope: '',
          authorizationUrl,
          tokenUrl,
          clientId: 'BBBB',
          clientSecret: 'AAAA',
          refreshErrorLimit: 100000,
          refreshInitialBackoff: 100000,
          refreshWaitCountLimit: 100000,
          refreshBackoffIncrement: 100000,
          accessTokenExpirationBuffer: 500,
        },
      }
    );

    // Add the new file for the integration (get, and then add one with /api/aForm)
    let integration = await ApiRequestMap.integration.get(account, integrationId);
    expect(integration).toBeHttp({ statusCode: 200 });
    integration.data.data.files['integration.js'] = [
      "const superagent = require('superagent');",
      "const { Router, Manager, Form } = require('@fusebit-int/framework');",
      'const router = new Router();',
      "router.get('/api/getSession', async (ctx) => {",
      "  const response = await superagent.get(`${ctx.state.params.baseUrl}/session/${ctx.query.session}`).set('Authorization', `Bearer ${ctx.state.params.functionAccessToken}`);",
      '  ctx.body = response.body;',
      '});',
      "router.get('/api/testSession', async (ctx) => {",
      "  let response = await superagent.put(`${ctx.state.params.baseUrl}/session/${ctx.query.session}`).set('Authorization', `Bearer ${ctx.state.params.functionAccessToken}`).send({ hello: 'world'});",
      '  const result = {};',
      "  response = await superagent.get(`${ctx.state.params.baseUrl}/session/${ctx.query.session}`).set('Authorization', `Bearer ${ctx.state.params.functionAccessToken}`);",
      '  result.get = response.body;',
      "  response = await superagent.get(`${ctx.state.params.baseUrl}/session/result/${ctx.query.session}`).set('Authorization', `Bearer ${ctx.state.params.functionAccessToken}`);",
      '  result.getResult = response.body;',
      '  ctx.body = result;',
      '});',
      "router.get('/api/getToken', async (ctx) => {",
      "  const response = await superagent.get(`${ctx.state.params.baseUrl}/session/${ctx.query.session}`).set('Authorization', `Bearer ${ctx.state.params.functionAccessToken}`);",
      '  ctx.body = response.body;',
      '});',
      "router.get('/api/aForm', async (ctx) => {",
      "  const response = await superagent.get(`${ctx.state.params.baseUrl}/session/${ctx.query.session}`).set('Authorization', `Bearer ${ctx.state.params.functionAccessToken}`);",
      '  console.log(response.data);',
      '  ctx.redirect(`${ctx.state.params.baseUrl}/session/${ctx.query.session}/callback`);',
      '});',
      "router.get('/api/doASessionThing/:sessionId', async (ctx) => { ctx.body = 'doASessionThing'; });",
      "router.get('/api/doAThing/:instanceId', async (ctx) => { ctx.body = 'doAThing'; });",
      'module.exports = router;',
    ].join('\n');
    const pkgJson = JSON.parse(integration.data.data.files['package.json']);
    pkgJson.dependencies.superagent = '*';
    integration.data.data.files['package.json'] = JSON.stringify(pkgJson);

    integration = await ApiRequestMap.integration.putAndWait(account, integrationId, integration.data);
    expect(integration).toBeHttp({ statusCode: 200 });
    // Create a session

    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: finalUrl,
    });
    expect(response).toBeHttp({ statusCode: 200 });

    const parentSessionId = response.data.id;

    // Start the "browser" on the session
    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 302 });

    // Validate that it goes to connector/api/configure
    expect(response.headers.location.indexOf(`${baseUrl}/connector/${connectorId}/api/configure?session=`)).toBe(0);
    let url = new URL(response.headers.location);
    expect(url.searchParams.get('redirect_uri')).toBe(
      `${baseUrl}/connector/${connectorId}/session/${url.searchParams.get('session')}/callback`
    );
    const connectorSessionId = url.searchParams.get('session');

    // Load the connector/api/configure
    response = await request({ url: response.headers.location, maxRedirects: 0 });
    expect(response).toBeHttp({ statusCode: 302 });

    // Validate that it goes to the redirectUrl/authorize
    expect(response.headers.location.indexOf(`${redirectUrl}/authorize`)).toBe(0);

    // Set up the HTTP service
    let oauthSessionId;
    httpServer.app.get('/authorize', (req: any, res: any) => {
      oauthSessionId = req.query.state;
      return res.redirect(`${req.query.redirect_uri}?state=${req.query.state}&code=EEEE`);
    });
    httpServer.app.post('/token', (req: any, res: any) => {
      return res.json(sampleToken);
    });

    // Load the authorization url
    response = await request({ url: response.headers.location, maxRedirects: 0 });
    expect(response).toBeHttp({ statusCode: 302 });
    expect(response.headers.location.indexOf(`/connector/${connectorId}/api/callback?state=`)).toBeGreaterThan(0);

    // Call the connector callback url to complete the OAuth exchange (connector writes to session in this
    // transaction).
    response = await request({ url: response.headers.location, maxRedirects: 0 });
    expect(response).toBeHttp({ statusCode: 302 });
    expect(
      response.headers.location.indexOf(`/connector/${connectorId}/session/${oauthSessionId}/callback`)
    ).toBeGreaterThan(0);

    // Call the session endpoint to complete this session.
    response = await request({ url: response.headers.location, maxRedirects: 0 });

    // Expect the form url
    expect(response).toBeHttp({ statusCode: 302 });
    expect(response.headers.location.indexOf(`/integration/${integrationId}/api/aForm?session=`)).toBeGreaterThan(0);
    url = new URL(response.headers.location);
    const formSessionId = url.searchParams.get('session');

    // Load the 'form' url.
    response = await request({ url: response.headers.location, maxRedirects: 0 });
    expect(response).toBeHttp({ statusCode: 302 });

    // Expect to be redirected to close the session out.
    expect(
      response.headers.location.indexOf(`/integration/${integrationId}/session/${formSessionId}/callback`)
    ).toBeGreaterThan(0);
    const completeLocation = response.headers.location;

    // Test the integration mid-form-session to see if it can get the connector token.
    response = await request({
      url: `${baseUrl}/integration/${integrationId}/api/getSession?session=${formSessionId}`,
      maxRedirects: 0,
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        id: formSessionId,
        uses: {
          conn1: {
            entityType: 'connector',
            componentId: connectorId,
            subordinateId: connectorSessionId,
          },
        },
      },
    });

    // Use the session in a different way
    response = await request({
      url: `${baseUrl}/integration/${integrationId}/api/testSession?session=${formSessionId}`,
      maxRedirects: 0,
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        get: {
          id: formSessionId,
          uses: {
            conn1: {
              entityType: 'connector',
              componentId: connectorId,
              subordinateId: connectorSessionId,
            },
          },
        },
        getResult: {
          id: formSessionId,
          uses: {
            conn1: {
              entityType: 'connector',
              componentId: connectorId,
              subordinateId: connectorSessionId,
            },
          },
          output: {
            hello: 'world',
          },
          target: {
            path: '/api/aForm',
            entityId: integrationId,
            entityType: 'integration',
          },
        },
      },
    });
    // Call the session endpoint to complete this session.
    response = await request({ url: completeLocation, maxRedirects: 0 });
    expect(response).toBeHttp({ statusCode: 302 });

    // Success, finished with the finalUrl.
    expect(response.headers.location.indexOf(`${finalUrl}?session=`)).toBe(0);
    url = new URL(response.headers.location);
    expect(url.searchParams.get('session')).toBe(parentSessionId);

    // POST to the session to instantiate the instances/identities.
    response = await ApiRequestMap.integration.session.postSession(account, integrationId, parentSessionId);
    expect(response).toBeHttp({
      statusCode: 200,
      data: { code: 200, type: 'session', verb: 'creating' },
      hasNot: ['payload'],
    });

    // Get the completed session with the output details
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
          componentId: integrationId,
          componentType: Model.EntityType.integration,
          subscriptionId: account.subscriptionId,
        },
        steps: [
          {
            name: 'conn1',
            target: {
              path: '/api/configure',
              entityId: connectorId,
              entityType: Model.EntityType.connector,
            },
          },
          {
            name: 'form',
            uses: ['conn1'],
            target: {
              path: '/api/aForm',
              entityId: integrationId,
              entityType: Model.EntityType.integration,
            },
          },
        ],
      },
    });
    expect(response.data.steps[0].childSessionId).toBeUUID();
    expect(response.data.steps[1].childSessionId).toBeUUID();

    expect(response.data.output.id).toBeUUID();

    const instanceId = response.data.output.id;

    response = await ApiRequestMap.instance.get(account, integrationId, instanceId);
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        id: instanceId,
        data: {
          form: {
            hello: 'world',
          },
          conn1: {
            tags: {
              'session.master': parentSessionId,
            },
            accountId: account.accountId,
            entityType: Model.EntityType.identity,
            componentId: connectorId,
            componentType: Model.EntityType.connector,
            subscriptionId: account.subscriptionId,
          },
        },
        tags: {
          'session.master': parentSessionId,
        },
      },
    });
    expect(response.data.data.conn1.id).toBeUUID();
  }, 180000);
});
