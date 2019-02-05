import { default as cors } from '@koa/cors';
import { default as getPort } from 'get-port';
import { default as Koa } from 'koa';
import { request } from '../src';

let port: number;
let testServer: { close: () => void };

beforeAll(async () => {
  const app = new Koa();
  app.use(cors());
  app.use(async context => {
    return new Promise(resolve => {
      let data = '';
      context.req.on('data', chunk => (data += chunk.toString()));
      context.req.on('end', () => {
        context.body = {
          method: context.request.method,
          url: context.request.url,
          headers: context.request.headers,
          data,
        };
        if (context.request.headers.accept === 'text/plain') {
          context.body = '{ "Json-but-as": "a-string" }';
          context.set('Content-Type', 'text/plain; charset=utf-8');
        }
        resolve();
      });
    });
  });

  port = await getPort();
  testServer = app.listen(port);
});

afterAll(async () => {
  testServer.close();
});

describe('request', () => {
  it('should use GET when just a URL is given', async () => {
    const response = await request(`http://localhost:${port}`);
    expect(response.status).toBe(200);
    expect(response.headers).toEqual({ 'content-type': 'application/json; charset=utf-8' });
    expect(response.data.method).toBe('GET');
    expect(response.data.headers.accept).toBe('application/json, text/plain, */*');
    expect(response.data.headers.referer).toBe('http://localhost/');
    expect(response.data.headers['accept-language']).toBe('en');
    expect(response.data.headers.host).toBe(`localhost:${port}`);
    expect(response.data.headers['accept-encoding']).toBe('gzip, deflate');
    expect(response.data.headers.connection).toBe('close');
    expect(response.data.data).toBe('');
  });

  it('should allow any method to be used', async () => {
    const testDataSet = ['GET', 'PUT', 'POST', 'DELETE', 'get', undefined];

    for (const method of testDataSet) {
      const response = await request({ method, url: `http://localhost:${port}` });
      expect(response.data.method).toBe(method ? method.toUpperCase() : 'GET');
    }
  });

  it('should not have any data with HEAD', async () => {
    const response = await request({ method: 'HEAD', url: `http://localhost:${port}` });
    expect(response.status).toBe(200);
    expect(response.headers).toEqual({ 'content-type': 'application/json; charset=utf-8' });
    expect(response.data).toBe(undefined);
  });

  it('should allow the accept header to be set', async () => {
    const response = await request({
      method: 'GET',
      url: `http://localhost:${port}`,
      headers: { Accept: 'text/plain' },
    });

    expect(response.data).toBe('{ "Json-but-as": "a-string" }');
  });

  it('should set the content-type to json if data is an object', async () => {
    const response = await request({
      method: 'POST',
      url: `http://localhost:${port}`,
      data: { 'here is some': 'data' },
    });
    expect(response.status).toBe(200);
    expect(response.headers).toEqual({ 'content-type': 'application/json; charset=utf-8' });
    expect(response.data.method).toBe('POST');
    expect(response.data.headers.accept).toBe('application/json, text/plain, */*');
    expect(response.data.headers['content-type']).toBe('application/json;charset=utf-8');
    expect(response.data.headers.referer).toBe('http://localhost/');
    expect(response.data.headers['accept-language']).toBe('en');
    expect(response.data.headers.host).toBe(`localhost:${port}`);
    expect(response.data.headers['accept-encoding']).toBe('gzip, deflate');
    expect(response.data.headers.connection).toBe('close');
    expect(response.data.data).toBe('{"here is some":"data"}');
  });

  it('should set the content-type to text if data is a string', async () => {
    const response = await request({
      method: 'POST',
      url: `http://localhost:${port}`,
      data: '{ "message": "hello world" }',
    });
    expect(response.status).toBe(200);
    expect(response.headers).toEqual({ 'content-type': 'application/json; charset=utf-8' });
    expect(response.data.method).toBe('POST');
    expect(response.data.headers.accept).toBe('application/json, text/plain, */*');
    expect(response.data.headers['content-type']).toBe('text/plain;charset=utf-8');
    expect(response.data.headers.referer).toBe('http://localhost/');
    expect(response.data.headers['accept-language']).toBe('en');
    expect(response.data.headers.host).toBe(`localhost:${port}`);
    expect(response.data.headers['accept-encoding']).toBe('gzip, deflate');
    expect(response.data.headers.connection).toBe('close');
    expect(response.data.data).toBe('{ "message": "hello world" }');
  });

  it('should not set the content-type to text if data is a string but the content-type is set', async () => {
    const response = await request({
      method: 'POST',
      url: `http://localhost:${port}`,
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      data: '{ "message": "hello world" }',
    });
    expect(response.status).toBe(200);
    expect(response.headers).toEqual({ 'content-type': 'application/json; charset=utf-8' });
    expect(response.data.method).toBe('POST');
    expect(response.data.headers.accept).toBe('application/json, text/plain, */*');
    expect(response.data.headers['content-type']).toBe('application/json;charset=utf-8');
    expect(response.data.headers.referer).toBe('http://localhost/');
    expect(response.data.headers['accept-language']).toBe('en');
    expect(response.data.headers.host).toBe(`localhost:${port}`);
    expect(response.data.headers['accept-encoding']).toBe('gzip, deflate');
    expect(response.data.headers.connection).toBe('close');
    expect(response.data.data).toBe('{ "message": "hello world" }');
  });
});
