import { random } from '@5qtrs/random';
import { request } from '@5qtrs/request';
import * as Constants from '@5qtrs/constants';

import {
  disableFunctionUsageRestriction,
  deleteFunction,
  putFunction,
  getFunction,
  listFunctions,
  getFunctionLocation,
  waitForBuild,
} from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id } = getEnv());

  // Tests here don't invoke functions, or if they do they don't care about the result, so the usage
  // restriction doesn't apply
  disableFunctionUsageRestriction();
});

const reflectVersion = (node: string, dependencies?: object) => ({
  nodejs: {
    files: {
      'package.json': { engines: { node, dependencies } },
      'index.js': 'module.exports = async (ctx) => ({ body: process.version });',
    },
  },
});

const modifiedCode = 'module.exports = async (ctx) => ({ body: `Changed: ${process.version}` });';

describe('Layers', () => {
  test('Version 17.5.0 (custom) works', async () => {
    let response = await putFunction(account, boundaryId, function1Id, reflectVersion('17.5.0'));
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 30, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toBe('v17.5.0');
  }, 120000);

  test('Version 17.5.0 (custom) with modules works', async () => {
    let response = await putFunction(account, boundaryId, function1Id, reflectVersion('17.5.0', { superagent: '*' }));
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 30, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toBe('v17.5.0');
  }, 120000);

  test('Code change in version 17.5.0 (custom) works', async () => {
    const spec = reflectVersion('17.5.0');
    let response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 30, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toBe('v17.5.0');
    spec.nodejs.files['index.js'] = modifiedCode;
    response = await putFunction(account, boundaryId, function1Id, spec);
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 30, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toBe('Changed: v17.5.0');
  }, 120000);

  test('Version change from 17.5.0 (custom) to 14 (built-in) works', async () => {
    let response = await putFunction(account, boundaryId, function1Id, reflectVersion('17.5.0'));
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 30, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toBe('v17.5.0');
    response = await putFunction(account, boundaryId, function1Id, reflectVersion('14'));
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 30, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toMatch(/^v14\./);
  }, 120000);

  test('Version change from 14 (built-in) to 17.5.0 (custom) works', async () => {
    let response = await putFunction(account, boundaryId, function1Id, reflectVersion('14'));
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 30, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toMatch(/^v14\./);
    response = await putFunction(account, boundaryId, function1Id, reflectVersion('17.5.0'));
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 30, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toBe('v17.5.0');
  }, 120000);

  test('Version change from 15.1.0 (custom) to 17.5.0 (custom) works', async () => {
    let response = await putFunction(account, boundaryId, function1Id, reflectVersion('15.1.0'));
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 30, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toBe('v15.1.0');
    response = await putFunction(account, boundaryId, function1Id, reflectVersion('17.5.0'));
    expect(response).toBeHttp({ statusCode: [200, 201] });
    if (response.status === 201) {
      response = await waitForBuild(account, response.data, 30, 1000);
      expect(response).toBeHttp({ statusCode: 200 });
    }
    response = await request(response.data.location);
    expect(response).toBeHttp({ statusCode: 200 });
    expect(response.data).toBe('v17.5.0');
  }, 120000);
});
