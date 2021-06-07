import { request } from '@5qtrs/request';

import { cleanupEntities, ApiRequestMap } from './sdk';

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

  test('Create a connector and an integration and associate the two', async () => {
    // Constants
    const authorizationUrl = `${redirectUrl}/authorize`;
    const tokenUrl = `${redirectUrl}/token`;

    const sampleToken = {
      access_token: 'EEEE',
      refresh_token: 'FFFF',
      token_type: 'access',
      message: boundaryId + '-token',
    };

    const state = 'CCCC';

    // Set up integration and connector
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
    integ.data.files['integration.js'] = [
      `const { Router, Manager, Form } = require('@fusebit-int/pkg-manager');`,
      `const router = new Router();`,
      ``,
      `router.get('/api/', async (ctx) => { ctx.body = 'banana'; });`,
      ``,
      `router.get('/api/:tenantId', async (ctx) => {`,
      `  const oauth = await ctx.state.manager.connectors.getByName('conn', (ctx) => ctx.params.tenantId)(ctx);`,
      `  ctx.body = oauth.accessToken;`,
      `});`,
    ].join('\n');

    response = await ApiRequestMap.integration.putAndWait(account, integ.id, integ);
    expect(response).toBeHttp({ statusCode: 200 });

    // Prime connector
    conn.data.configuration = {
      package: '@fusebit-int/pkg-oauth-connector',
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
    };

    response = await ApiRequestMap.connector.putAndWait(account, conn.id, conn);
    expect(response).toBeHttp({ statusCode: 200 });

    // Set up the HTTP service
    httpServer.app.get('/authorize', (req: any, res: any) => {
      return res.json({ message: boundaryId + '-authorize-' + req.query.state });
    });
    httpServer.app.post('/token', (req: any, res: any) => {
      return res.json(sampleToken);
    });

    // Test the HTTP service
    response = await request({ method: 'GET', url: authorizationUrl, query: { state } });
    expect(response).toBeHttp({ statusCode: 200 });

    response = await request({ method: 'POST', url: tokenUrl, query: { state } });
    expect(response).toBeHttp({ statusCode: 200, data: sampleToken });

    // Invoke flow
    response = await ApiRequestMap.connector.dispatch(account, conn.id, 'GET', `/api/configure?state=${state}`, {
      maxRedirects: 0,
    });
    expect(response).toBeHttp({ statusCode: 302 });
    const loc = response.headers.location;
    const uri = new URL(loc);

    // Test location to make sure it contains the tunnel address
    expect(loc).toMatch(new RegExp(`^${authorizationUrl}`));

    expect(uri.searchParams.get('redirect_uri')).toMatch(new RegExp(`^https://${process.env.LOGS_HOST}`));

    // Request the tunnel addresss authorizationUrl
    response = await request({ method: 'GET', url: loc });
    expect(response.data).toEqual({ message: boundaryId + '-authorize-' + state });

    // Call the redirect_uri with the expected parameters.
    response = await request({
      method: 'GET',
      url: uri.searchParams.get('redirect_uri') as string,
      query: { state: uri.searchParams.get('state'), code: 'DDDD' },
    });

    // Right now it returns the actual token.  In the "real world", this would be biased through a session,
    // and this check would load the session contents and validate they match what's expected.
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        access_token: 'EEEE',
        refresh_token: 'FFFF',
        token_type: 'access',
        message: `${boundaryId}-token`,
        status: 'authenticated',
      },
    });
  }, 180000);
});
