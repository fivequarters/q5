import { createServer, Server } from 'http';
import packageJson from '../package.json';
import { request } from '../src';
import { response } from 'express';

// @ts-ignore
const port = packageJson.devServer.port;
let server: Server;

beforeAll(async () => {
  server = createServer((req, res) => {
    let data = '';
    req.on('data', chunk => (data += chunk.toString()));
    req.on('end', () => {
      const body = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        data,
      };
      let payload = JSON.stringify(body);
      let contentType = 'application/json; charset=utf-8';
      if (req.headers.accept === 'text/plain') {
        payload = '{ "Json-but-as": "a-string" }';
        contentType = 'text/plain; charset=utf-8';
      }
      res.setHeader('content-type', contentType);
      res.write(payload);
      res.statusCode = 200;
      res.end();
      //
    });
  });

  server.listen(port);
});

afterAll(async () => {
  server.close();
});

describe('request', () => {
  it('should use GET when just a URL is given', async () => {
    const response = await request(`http://localhost:${port}`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.data.method).toBe('GET');
    expect(response.data.headers.accept).toBe('application/json, text/plain, */*');
    expect(response.data.headers.host).toBe(`localhost:${port}`);
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
    expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
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
    expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.data.method).toBe('POST');
    expect(response.data.headers.accept).toBe('application/json, text/plain, */*');
    expect(response.data.headers['content-type']).toBe('application/json;charset=utf-8');
    expect(response.data.headers.host).toBe(`localhost:${port}`);
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
    expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.data.method).toBe('POST');
    expect(response.data.headers.accept).toBe('application/json, text/plain, */*');
    expect(response.data.headers['content-type']).toBe('text/plain;charset=utf-8');
    expect(response.data.headers.host).toBe(`localhost:${port}`);
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
    expect(response.headers['content-type']).toEqual('application/json; charset=utf-8');
    expect(response.data.method).toBe('POST');
    expect(response.data.headers.accept).toBe('application/json, text/plain, */*');
    expect(response.data.headers['content-type']).toBe('application/json;charset=utf-8');
    expect(response.data.headers.host).toBe(`localhost:${port}`);
    expect(response.data.headers.connection).toBe('close');
    expect(response.data.data).toBe('{ "message": "hello world" }');
  });

  it('should validate the response status code', async () => {
    let message = '';
    try {
      const response = await request({
        url: `http://localhost:${port}`,
        validStatus: (status: number) => status !== 200,
      });
    } catch (error) {
      message = error.message;
    }
    expect(message).toBe('Request failed with response status code: 200');
  });

  it('should allow the validate check to throw its own error', async () => {
    let message = '';
    try {
      const response = await request({
        url: `http://localhost:${port}`,
        validStatus: (status: number) => {
          throw new Error(`Custom error: ${status}`);
        },
      });
    } catch (error) {
      message = error.message;
    }
    expect(message).toBe(`Custom error: 200`);
  });

  it('should support query parameters', async () => {
    const response = await request({
      url: `http://localhost:${port}/somePath`,
      query: { a: 'hello', b: 5, c: false, d: null, e: undefined },
    });
    expect(response.data.url).toBe('/somePath?a=hello&b=5&c=false');
  });
});
