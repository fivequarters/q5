import { request } from '@5qtrs/request';

import { putFunction } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

describe('Function Trace', () => {
  test('Validate that the function works with garbage in the options', async () => {
    const testRequest = {
      nodejs: {
        files: {
          'index.js': [
            'const http = require("http");',
            'module.exports = (ctx, cb) => {',
            '  const circular = {};',
            '  const opts = { method: "GET", http, circular };',
            '  circular.opts = opts;',
            '  http.request("http://www.google.com", opts, () => cb(null, { body: "ok"})).end();',
            '}',
          ].join('\n'),
        },
      },
    };

    let response = await putFunction(account, boundaryId, function1Id, testRequest);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 120000);

  test('http.request works', async () => {
    const testRequest = {
      nodejs: {
        files: {
          'index.js': [
            'const http = require("http");',
            'module.exports = (ctx, cb) => {',
            '  http.request("http://www.google.com", { method: "GET" }, () => cb(null, { body: "ok"})).end();',
            '}',
          ].join('\n'),
        },
      },
    };

    let response = await putFunction(account, boundaryId, function1Id, testRequest);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 120000);

  test('http.request without method in the options works', async () => {
    const testRequest = {
      nodejs: {
        files: {
          'index.js': [
            'const http = require("http");',
            'module.exports = (ctx, cb) => {',
            '  http.request("http://www.google.com", { }, () => cb(null, { body: "ok"})).end();',
            '}',
          ].join('\n'),
        },
      },
    };

    let response = await putFunction(account, boundaryId, function1Id, testRequest);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 120000);

  test('http.get works', async () => {
    const testRequest = {
      nodejs: {
        files: {
          'index.js': [
            'const http = require("http");',
            'module.exports = (ctx, cb) => {',
            '  http.get("http://www.google.com", () => cb(null, { body: "ok"})).end();',
            '}',
          ].join('\n'),
        },
      },
    };

    let response = await putFunction(account, boundaryId, function1Id, testRequest);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 120000);

  test('Superagent.get works', async () => {
    const testRequest = {
      nodejs: {
        files: {
          'index.js': [
            'const superagent = require("superagent");',
            'module.exports = (ctx, cb) => {',
            '  superagent.get("http://www.google.com").then(() => cb(null, { body: "ok"}));',
            '}',
          ].join('\n'),
          'package.json': { dependencies: { superagent: '*' } },
        },
      },
    };

    let response = await putFunction(account, boundaryId, function1Id, testRequest);
    expect(response).toBeHttp({ statusCode: 200 });
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
  }, 120000);
});
