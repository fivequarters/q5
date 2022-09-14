import {
  disableFunctionUsageRestriction,
  deleteFunction,
  putFunction,
  getFunctionRedirect,
  deleteFunctionRedirect,
  postFunctionRedirect,
  callFunction,
} from './sdk';

import { startTunnel, startHttpServer } from './tunnel';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const REQ_SUFFIX = 'tunnel.dev.fivequarters.io';

const helloWorld = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello" });',
    },
  },
};

const helloWorld2 = {
  nodejs: {
    files: {
      'index.js': 'module.exports = (ctx, cb) => cb(null, { body: "hello2" });',
    },
  },
};

describe('Function Redirect', () => {
  const redirectUrl = `https://ancient-lionfish-50.${REQ_SUFFIX}`;

  test('create function lacks redirect', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await getFunctionRedirect(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200, hasNot: ['redirectUrl'] });
  }, 120000);

  test('function accepts redirect', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await postFunctionRedirect(account, boundaryId, function1Id, redirectUrl);
    expect(response).toBeHttp({ statusCode: 200, data: { redirectUrl } });

    response = await getFunctionRedirect(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200, data: { redirectUrl } });
  }, 120000);

  test('function redirect is deleted', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await postFunctionRedirect(account, boundaryId, function1Id, redirectUrl);
    expect(response).toBeHttp({ statusCode: 200, data: { redirectUrl } });

    response = await deleteFunctionRedirect(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await getFunctionRedirect(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200, hasNot: ['redirectUrl'] });
  }, 120000);

  test('invalid redirects rejected', async () => {
    const invalidRedirects = [
      `https://test.${REQ_SUFFIX}.com`,
      `http://test.${REQ_SUFFIX}`,
      `http://${REQ_SUFFIX}`,
      `http://example.com?https://test.${REQ_SUFFIX}`,
    ];
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });

    await Promise.all(
      invalidRedirects.map(async (uri) => {
        response = await postFunctionRedirect(account, boundaryId, function1Id, uri);
        expect(response).toBeHttp({
          statusCode: 400,
          data: { status: 400, statusCode: 400, message: 'redirectUrl: Unsupported tunnel endpoint' },
        });
      })
    );
  }, 120000);

  test('redirect on invalid function', async () => {
    const response = await postFunctionRedirect(account, boundaryId, function1Id, redirectUrl);
    expect(response).toBeHttp({ statusCode: 404 });
  }, 120000);

  test('delete function and try setting redirect', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await deleteFunction(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 204 });

    // Allow time for DynamoDB to settle.
    await new Promise((resolve) => setTimeout(resolve, 3000));

    response = await postFunctionRedirect(account, boundaryId, function1Id, redirectUrl);
    expect(response).toBeHttp({ statusCode: 404, data: { message: 'Function not found' } });
  }, 120000);

  test('set redirect and then update function', async () => {
    disableFunctionUsageRestriction();
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await postFunctionRedirect(account, boundaryId, function1Id, redirectUrl);
    expect(response).toBeHttp({ statusCode: 200, data: { redirectUrl } });

    response = await getFunctionRedirect(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200, data: { redirectUrl } });

    // Function hasn't changed, not rebuilt so the redirect remains.
    response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 204 });

    response = await getFunctionRedirect(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200, data: { redirectUrl } });

    // Function changes; redirect removed.
    response = await putFunction(account, boundaryId, function1Id, helloWorld2);
    expect(response).toBeHttp({ statusCode: 200 });

    response = await getFunctionRedirect(account, boundaryId, function1Id);
    expect(response).toBeHttp({ statusCode: 200, hasNot: ['redirectUrl'] });
  }, 120000);
});

describe('Function Redirection', () => {
  let port = 0;
  let httpServer: any;
  let tunnel: any;
  let redirectUrl: string;

  beforeEach(async () => {
    httpServer = startHttpServer(port);
    httpServer.service = await httpServer.listen();
    port = httpServer.service.address().port;

    tunnel = await startTunnel(port);

    redirectUrl = `https://${tunnel.subdomain}.tunnel.dev.fivequarters.io`;
  });

  afterEach(async () => {
    httpServer.service.close();
    tunnel.tunnel.close();
  });

  test('set redirect and receive request', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    const location = response.data.location;

    response = await postFunctionRedirect(account, boundaryId, function1Id, redirectUrl);
    expect(response).toBeHttp({ statusCode: 200, data: { redirectUrl } });

    let called = false;
    httpServer.app.use((req: any, res: any) => {
      called = true;
      expect(req.method).toBe('POST');
      return res.json({ body: { message: 'hello world' } });
    });

    response = await callFunction('', location);
    expect(response).toBeHttp({ statusCode: 200, data: { message: 'hello world' } });
    expect(called).toBe(true);
  }, 120000);

  test('headers are returned', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    const location = response.data.location;

    response = await postFunctionRedirect(account, boundaryId, function1Id, redirectUrl);
    expect(response).toBeHttp({ statusCode: 200, data: { redirectUrl } });

    let called = false;
    httpServer.app.use((req: any, res: any) => {
      called = true;
      expect(req.method).toBe('POST');
      return res.json({ body: { message: 'hello world' }, headers: { 'X-Example-Header': 'value' } });
    });

    response = await callFunction('', location);
    expect(response).toBeHttp({
      statusCode: 200,
      data: { message: 'hello world' },
      headers: { 'x-example-header': 'value' },
    });
    expect(called).toBe(true);
  }, 120000);

  test('errors are returned', async () => {
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    const location = response.data.location;

    response = await postFunctionRedirect(account, boundaryId, function1Id, redirectUrl);
    expect(response).toBeHttp({ statusCode: 200, data: { redirectUrl } });

    let called = false;
    httpServer.app.use((req: any, res: any) => {
      called = true;
      expect(req.method).toBe('POST');
      return res.json({ status: 501, body: { message: 'hello world' } });
    });

    response = await callFunction('', location);
    expect(response).toBeHttp({
      statusCode: 501,
      data: { message: 'hello world' },
    });
    expect(called).toBe(true);
  }, 120000);

  test('check error on bad redirect', async () => {
    const badRedirectUrl = `https://foobar.${REQ_SUFFIX}`;
    let response = await putFunction(account, boundaryId, function1Id, helloWorld);
    expect(response).toBeHttp({ statusCode: 200 });
    const location = response.data.location;

    response = await postFunctionRedirect(account, boundaryId, function1Id, badRedirectUrl);
    expect(response).toBeHttp({ statusCode: 200, data: { redirectUrl: badRedirectUrl } });

    let called = false;
    httpServer.app.use((req: any, res: any) => {
      called = true;
      expect(req.method).toBe('POST');
      return res.json({ body: { message: 'hello world' } });
    });

    response = await callFunction('', location);
    expect(response).toBeHttp({ statusCode: 404 });
    expect(called).toBe(false);
  }, 120000);
});
