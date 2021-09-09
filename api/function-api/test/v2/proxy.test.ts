import express from 'express';
import { DynamoDB } from 'aws-sdk';
import http_error from 'http-errors';

import RDS from '@5qtrs/db';
import { request } from '@5qtrs/request';
import { Defaults } from '@5qtrs/account';
import * as Constants from '@5qtrs/constants';

import * as OAuthProxyConfig from '../../libc/routes/service/OAuthProxyConfig';
import { OAuthProxyService, IOAuthProxyConfiguration } from '../../libc/routes/service/OAuthProxyService';

import { cleanupEntities, ApiRequestMap, createPair } from './sdk';
import { refreshSubscriptionCache } from '../v1/sdk';
import { startTunnel, startHttpServer } from '../v1/tunnel';

import { getEnv } from '../v1/setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });
let oldDefaults: any;
let oldConfig: any;

beforeEach(async () => {
  try {
    oldConfig = await OAuthProxyConfig.get<IOAuthProxyConfiguration>('slack', account);
  } catch (error) {
    if (error.status === 404) {
      oldConfig = {};
    } else {
      console.log(`Error: ${JSON.stringify(error)}`);
      throw error;
    }
  }

  oldDefaults = await Defaults.get(dynamo, Constants.DEFAULTS_SUBSCRIPTION);
  await Defaults.set(dynamo, Constants.DEFAULTS_SUBSCRIPTION, {
    proxy: { accountId: account.accountId, subscriptionId: account.subscriptionId },
  });
});

afterEach(async () => {
  await Defaults.set(dynamo, Constants.DEFAULTS_SUBSCRIPTION, oldDefaults);
  await OAuthProxyConfig.set<IOAuthProxyConfiguration>('slack', account, oldConfig);
});

afterAll(async () => {
  await cleanupEntities(account);
}, 30000);

describe('Proxy', () => {
  let port = 0;
  let httpServer: any;
  let tunnel: any;
  let redirectUrl: string;
  let connectorUrl: string;

  let baseUrl: string;
  let authorizationUrl: string;
  let tokenUrl: string;
  let revokeUrl: string;
  let localIdentity: { clientId: string; clientSecret: string };

  const proxyIdentity = {
    clientId: 'TEST_PROXY_CLIENT_ID',
    clientSecret: 'TEST_PROXY_CLIENT_SECRET',
  };

  let sampleToken: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    message: string;
  };

  let replacementToken: string;

  let httpLog: { req: express.Request; res: express.Response }[];

  beforeEach(async () => {
    httpServer = startHttpServer(port);
    httpServer.service = await httpServer.listen();
    port = httpServer.service.address().port;
    tunnel = await startTunnel(port);

    httpLog = [];

    baseUrl = `${Constants.API_PUBLIC_ENDPOINT}/v2/account/${account.accountId}/subscription/${account.subscriptionId}`;

    redirectUrl = `https://${tunnel.subdomain}.tunnel.dev.fusebit.io`;
    authorizationUrl = `${redirectUrl}/authorize`;
    tokenUrl = `${redirectUrl}/token`;
    revokeUrl = `${redirectUrl}/revoke`;

    localIdentity = {
      clientId: 'TEST_LOCAL_CLIENT_ID' + boundaryId,
      clientSecret: 'TEST_LOCAL_CLIENT_SECRET' + boundaryId,
    };

    sampleToken = {
      access_token: 'TEST_ACCESS_TOKEN' + boundaryId,
      refresh_token: 'TEST_TOKEN' + boundaryId,
      token_type: 'TEST_TOKEN_TYPE',
      message: boundaryId + '-token',
    };

    replacementToken = boundaryId + '-replacement-token';
  });

  afterEach(async () => {
    httpServer.service.close();
    tunnel.tunnel.close();
  });

  const configureProxy = async () => {
    await refreshSubscriptionCache(account);

    await OAuthProxyConfig.set<IOAuthProxyConfiguration>('slack', account, {
      ...proxyIdentity,
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      authorizationUrl,
      tokenUrl,
      revokeUrl,
    });
  };

  const createConnector = async () => {
    const response = await ApiRequestMap.connector.postAndWait(account, boundaryId, {
      id: boundaryId,
      data: {
        handler: '@fusebit-int/oauth-connector',
        configuration: {
          scope: '',
          authorizationUrl: `${baseUrl}/connector/${boundaryId}/proxy/slack/oauth/authorize`,
          tokenUrl: `${baseUrl}/connector/${boundaryId}/proxy/slack/oauth/token`,
          ...localIdentity,
        },
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    connectorUrl = `${baseUrl}/connector/${boundaryId}`;
  };

  let serverTokenHandler: (req: express.Request, res: express.Response) => void;

  const registerOAuthServer = () => {
    serverTokenHandler = (req: express.Request, res: express.Response) => {
      httpLog.push({ req, res });
      return res.json({ ...sampleToken, access_token: replacementToken });
    };
    httpServer.app.post(
      '/token',
      express.urlencoded({ extended: true }),
      (req: express.Request, res: express.Response) => serverTokenHandler(req, res)
    );

    httpServer.app.get('/authorize', (req: express.Request, res: express.Response) => {
      httpLog.push({ req, res });
      return res.redirect(`${req.query.redirect_uri}?state=${req.query.state}&code=EEEE`);
    });

    httpServer.app.post(
      '/revoke',
      express.urlencoded({ extended: true }),
      (req: express.Request, res: express.Response) => {
        httpLog.push({ req, res });
        return res.status(200).end();
      }
    );
  };

  test('Proxy redirects to the http endpoint', async () => {
    await configureProxy();
    registerOAuthServer();

    const validCode = 'acode';

    // Create the various artifacts
    const { integrationId, connectorId } = await createPair(
      account,
      boundaryId,
      {},
      {
        handler: '@fusebit-int/oauth-connector',
        configuration: {
          scope: '',
          authorizationUrl: `${baseUrl}/connector/${boundaryId}-con/proxy/slack/oauth/authorize`,
          tokenUrl: `${baseUrl}/connector/${boundaryId}-con/proxy/slack/oauth/token`,
          ...localIdentity,
        },
      }
    );
    connectorUrl = `${baseUrl}/connector/${connectorId}`;

    // Create a utility proxyService mostly to access the storage
    const proxyService = new OAuthProxyService(account.accountId, account.subscriptionId, connectorId, 'slack', {
      clientId: 'A',
      clientSecret: 'B',
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      authorizationUrl,
      tokenUrl,
      revokeUrl,
    });

    // Create a session
    let response = await ApiRequestMap.integration.session.post(account, integrationId, {
      redirectUrl: 'https://monkey.banana',
    });
    const parentSessionId = response.data.id;

    // Start the "browser" on the session
    response = await ApiRequestMap.integration.session.start(account, integrationId, parentSessionId);
    expect(response).toBeHttp({ statusCode: 302 });

    // Get the session for the connector
    const conUrl = new URL(response.headers.location);
    const connectorSessionId = conUrl.searchParams.get('session') as string;

    // Load what the connector offers
    response = await request({ url: response.headers.location, maxRedirects: 0 });
    expect(response).toBeHttp({ statusCode: 302 });

    // Validate it's pointed at the proxy
    expect(response.headers.location.indexOf(`${connectorUrl}/proxy/slack/oauth/authorize?`)).toBeGreaterThan(-1);
    expect(response.headers.location.indexOf('undefined')).toBe(-1);
    let url = new URL(response.headers.location);
    expect(url.searchParams.get('client_id')).toBe(localIdentity.clientId);

    // Load what the proxy offers
    response = await request({ url: response.headers.location, maxRedirects: 0 });
    expect(response).toBeHttp({ statusCode: 302 });
    expect(response.headers.location.indexOf(authorizationUrl)).toBe(0);

    // Validate the request has the proxy's clientId
    url = new URL(response.headers.location);
    expect(url.searchParams.get('client_id')).toBe(proxyIdentity.clientId);
    expect(url.searchParams.get('redirect_uri')).toMatch(
      new RegExp(
        `/v2/account/${account.accountId}/subscription/${account.subscriptionId}/connector/${connectorId}/proxy/slack/oauth/callback$`
      )
    );
    const initialRedirectUrl = url.searchParams.get('redirect_uri');

    // Fake a response, bounce back to the proxy with a code
    response = await request({
      url: `${url.searchParams.get('redirect_uri')}?state=${url.searchParams.get('state')}&code=${validCode}`,
      maxRedirects: 0,
    });
    expect(response).toBeHttp({ statusCode: 302 });

    // Call into the connector with a code
    response = await request({ url: response.headers.location, maxRedirects: 0 });
    expect(response).toBeHttp({ statusCode: 302 });

    // Validate that it called the http endpoint with the appropriate parameters
    expect(httpLog.length).toBe(1);
    expect(httpLog[0].req.body.redirect_uri).toBe(initialRedirectUrl);

    // Validate that storage includes what's expected compared to what's in the session
    const session = await ApiRequestMap.connector.session.getResult(account, connectorId, connectorSessionId);
    expect(session.data.output.token.refresh_token).toBeUUID();
    expect(
      await proxyService.loadCode(
        localIdentity.clientId,
        localIdentity.clientSecret,
        session.data.output.token.refresh_token
      )
    ).toBe(sampleToken.refresh_token);

    const randomValue = 'asdfg';

    // Change the handler to validate the request payload has been modified
    serverTokenHandler = (req: express.Request, res: express.Response) => {
      expect(req.body.refresh_token).toBe(sampleToken.refresh_token);
      expect(req.body.client_id).toBe(proxyIdentity.clientId);
      expect(req.body.client_secret).toBe(proxyIdentity.clientSecret);
      expect(req.body.random_value).toBe(randomValue);

      return res.json({ ...sampleToken, access_token: replacementToken });
    };

    // Call to convert the refresh_token into an access token
    response = await request({
      method: 'POST',
      url: `${connectorUrl}/proxy/slack/oauth/token`,
      data: {
        client_id: localIdentity.clientId,
        client_secret: localIdentity.clientSecret,
        refresh_token: session.data.output.token.refresh_token,
        random_value: randomValue,
        grant_type: 'refresh_token',
      },
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        access_token: replacementToken,
        token_type: sampleToken.token_type,
      },
    });
    expect(response.data.refresh_token).toBeUUID();
  }, 180000);

  // /authorize:
  //   Call with a bad redirect_uri
  test('Authorize rejects if the redirect_uri does not match', async () => {
    await configureProxy();
    await createConnector();

    const response = await request({
      url: `${connectorUrl}/proxy/slack/oauth/authorize?response_type=code&scope=&state=00000000-0000-0000-0000-000000000000&client_id=aaa&redirect_uri=monkey`,
    });
    expect(response).toBeHttp({ statusCode: 403 });
  }, 180000);

  //   Call with a bad clientId
  test('Authorize rejects if the client_id does not match', async () => {
    await configureProxy();

    // Create the various artifacts
    const { integrationId, connectorId } = await createPair(
      account,
      boundaryId,
      {},
      {
        handler: '@fusebit-int/oauth-connector',
        configuration: {
          scope: '',
          authorizationUrl: `${baseUrl}/connector/${boundaryId}/proxy/slack/oauth/authorize`,
          tokenUrl: `${baseUrl}/connector/${boundaryId}/proxy/slack/oauth/token`,
          ...localIdentity,
        },
      }
    );
    connectorUrl = `${baseUrl}/connector/${connectorId}`;

    // Create a session
    let response = await ApiRequestMap.integration.session.post(account, integrationId, { redirectUrl: 'http://a.b' });

    // Start the "browser" on the session
    response = await ApiRequestMap.integration.session.start(account, integrationId, response.data.id);
    expect(response).toBeHttp({ statusCode: 302 });

    // Get the session for the connector
    const conUrl = new URL(response.headers.location);
    const connectorSessionId = conUrl.searchParams.get('session');

    // Validate that the proxy rejects due to the mismatched client_id
    response = await request({
      url: `${connectorUrl}/proxy/slack/oauth/authorize?client_id=zzzz&state=${connectorSessionId}&redirect_uri=${connectorUrl}/api/callback`,
      maxRedirects: 0,
    });
    expect(response).toBeHttp({ statusCode: 403 });

    // Validate that the proxy rejects due to an invalid session_id
    response = await request({
      url: `${connectorUrl}/proxy/slack/oauth/authorize?client_id=${localIdentity.clientId}&state=00000000-0000-0000-0000-000000000000&redirect_uri=${connectorUrl}/api/callback`,
      maxRedirects: 0,
    });
    expect(response).toBeHttp({ statusCode: 403 });

    // Validate that the proxy rejects due to an invalid redirect_uri
    response = await request({
      url: `${connectorUrl}/proxy/slack/oauth/authorize?client_id=${localIdentity.clientId}&state=${connectorSessionId}&redirect_uri=http://google.com`,
      maxRedirects: 0,
    });
    expect(response).toBeHttp({ statusCode: 403 });

    // Validate that the same request but with valid parameters succeeds
    response = await request({
      url: `${connectorUrl}/proxy/slack/oauth/authorize?client_id=${localIdentity.clientId}&state=${connectorSessionId}&redirect_uri=${connectorUrl}/api/callback`,
      maxRedirects: 0,
    });
    expect(response).toBeHttp({ statusCode: 302 });
  }, 180000);

  //
  // /callback
  //   Call with a non-sessionId state
  test('Callback rejects when used with an invalid session', async () => {
    await configureProxy();
    await createConnector();

    const response = await request(
      `${connectorUrl}/proxy/slack/oauth/callback?state=00000000-0000-0000-0000-000000000000&code=acode`
    );
    expect(response).toBeHttp({ statusCode: 403 });
  }, 180000);

  //
  // /token
  test('Token rejects for a variety of bad parameters', async () => {
    await configureProxy();
    await createConnector();
    registerOAuthServer();

    // Prime with a valid code
    const validCode = 'acode';
    const proxyService = new OAuthProxyService(account.accountId, account.subscriptionId, boundaryId, 'slack', {
      clientId: 'A',
      clientSecret: 'B',
      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      authorizationUrl,
      tokenUrl,
      revokeUrl,
    });
    await proxyService.saveCode(localIdentity.clientId, localIdentity.clientSecret, validCode, validCode, 10000);

    // Rejects with an bad clientId
    let response = await request({
      method: 'POST',
      url: `${connectorUrl}/proxy/slack/oauth/token`,
      data: {
        grant_type: 'authorization_code',
        client_id: 'ZZZZ',
        client_secret: localIdentity.clientSecret,
        code: validCode,
      },
    });
    expect(response).toBeHttp({ statusCode: 403 });

    // Rejects with an bad clientSecret
    response = await request({
      method: 'POST',
      url: `${connectorUrl}/proxy/slack/oauth/token`,
      data: {
        grant_type: 'authorization_code',
        client_id: localIdentity.clientId,
        client_secret: 'ZZZZ',
        code: validCode,
      },
    });
    expect(response).toBeHttp({ statusCode: 403 });

    // Rejects with an bad code
    response = await request({
      method: 'POST',
      url: `${connectorUrl}/proxy/slack/oauth/token`,
      data: {
        grant_type: 'authorization_code',
        client_id: localIdentity.clientId,
        client_secret: localIdentity.clientSecret,
        code: 'ZZZZ',
      },
    });
    expect(response).toBeHttp({ statusCode: 403 });

    // All in returns a code
    response = await request({
      method: 'POST',
      url: `${connectorUrl}/proxy/slack/oauth/token`,
      data: {
        grant_type: 'authorization_code',
        client_id: localIdentity.clientId,
        client_secret: localIdentity.clientSecret,
        code: validCode,
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data.access_token).toBe(replacementToken);
    expect(response.data.refresh_token).not.toBe(sampleToken.refresh_token);
  }, 180000);

  // /revoke
  test('Revoke rejects for a variety of bad parameters', async () => {
    await configureProxy();
    await createConnector();
    registerOAuthServer();

    // Prime with a valid code
    const validCode = 'acode';
    const proxyService = new OAuthProxyService(account.accountId, account.subscriptionId, boundaryId, 'slack', {
      clientId: 'A',
      clientSecret: 'B',

      accountId: account.accountId,
      subscriptionId: account.subscriptionId,
      authorizationUrl,
      tokenUrl,
      revokeUrl,
    });
    await proxyService.saveCode(localIdentity.clientId, localIdentity.clientSecret, validCode, validCode, 10000);

    // Rejects with an bad clientId
    let response = await request({
      method: 'POST',
      url: `${connectorUrl}/proxy/slack/oauth/revoke`,
      data: {
        client_id: 'ZZZZ',
        token: validCode,
        token_type_hint: 'refresh_token',
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });
    let loaded = await proxyService.loadCode(localIdentity.clientId, localIdentity.clientSecret, validCode);
    expect(loaded).toBe(validCode);

    // Rejects with an bad token_type_hint
    response = await request({
      method: 'POST',
      url: `${connectorUrl}/proxy/slack/oauth/revoke`,
      data: {
        client_id: localIdentity.clientId,
        token: validCode,
        token_type_hint: 'bananas',
      },
    });
    expect(response).toBeHttp({ statusCode: 400 });
    loaded = await proxyService.loadCode(localIdentity.clientId, localIdentity.clientSecret, validCode);
    expect(loaded).toBe(validCode);

    // With a valid refresh_token, it gets removed from storage
    response = await request({
      method: 'POST',
      url: `${connectorUrl}/proxy/slack/oauth/revoke`,
      data: {
        client_id: localIdentity.clientId,
        token: validCode,
        token_type_hint: 'refresh_token',
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });

    // Revoke immediately returns; wait for it to finish.
    do {
      try {
        loaded = await proxyService.loadCode(localIdentity.clientId, localIdentity.clientSecret, validCode);
      } catch (error) {
        expect(error).toEqual(http_error(404));
        break;
      }
    } while (loaded === validCode);

    // With a valid request but a non-refresh hint, the http service gets hit
    response = await request({
      method: 'POST',
      url: `${connectorUrl}/proxy/slack/oauth/revoke`,
      data: {
        client_id: localIdentity.clientId,
        token: validCode,
        token_type_hint: 'access_token',
      },
    });
    expect(response).toBeHttp({ statusCode: 200 });

    // Wait for the request to be processed.
    while (httpLog.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    expect(httpLog.length).toBe(1);
    expect(httpLog[0].req.body.token).toBe(validCode);
  }, 180000);
});
