import { IAccount } from './accountResolver';
import { request, IHttpResponse, IHttpRequest } from '@5qtrs/request';
import { random } from '@5qtrs/random';
import { signJwt } from '@5qtrs/jwt';
import { createKeyPair, IKeyPairResult } from '@5qtrs/key-pair';
import { pem2jwk } from 'pem-jwk';

import { nextBoundary } from './setup';

import * as Constants from '@5qtrs/constants';
import { IAccount as IAccountAPI } from '@5qtrs/account-data';

export const INVALID_UUID = '00000000-0000-4000-8000-000000000000';

// ------------------
// Validate running environment
// ------------------

// Warning on environment running without ngrok - this causes a variety of failures that are often surprising.
if (!process.env.LOGS_HOST) {
  if (!process.env.API_SERVER) {
    console.log('Missing API_SERVER');
    process.exit(-1);
  }

  if (process.env.API_SERVER.indexOf('://localhost') > 0) {
    console.log('WARNING: LOGS_HOST IS NOT SPECIFIED - localhost tests must have a tunnel running.');
  }
}

if (!process.env.LAMBDA_USER_FUNCTION_PERMISSIONLESS_ROLE) {
  console.log('Missing LAMBDA_USER_FUNCTION_PERMISSIONLESS_ROLE');
  process.exit(-1);
}

// ------------------
// Internal Constants
// ------------------

const testUsers: string[] = [];
const testClients: string[] = [];
const testIssuers: string[] = [];
const testHostedIssuers: string[] = [];
const testStorage: string[] = [];

const hostedIssuersBoundary = nextBoundary();

// -------------------
// Exported Interfaces
// -------------------

export interface IListUserOptions {
  count?: number;
  next?: string;
  name?: string;
  email?: string;
  issuerId?: string;
  subject?: string;
  include?: boolean;
  exact?: boolean;
}

export interface IListClientOptions {
  count?: number;
  next?: string;
  name?: string;
  issuerId?: string;
  subject?: string;
  include?: boolean;
  exact?: boolean;
}

export interface IListAuditOptions {
  count?: number;
  next?: string;
  action?: string;
  resource?: string;
  issuerId?: string;
  subject?: string;
  from?: string;
  to?: string;
}

export interface IInitOptions {
  protocol?: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
  profile?: {
    id?: string;
    displayName?: string;
    subscription?: string;
    boundary?: string;
    function?: string;
    oauth?: {
      webAuthorizationUrl?: string;
      webClientId?: string;
      webLogoutUrl?: string;
      deviceAuthorizationUrl?: string;
      deviceClientId?: string;
      tokenUrl?: string;
    };
  };
}

export interface IInitResolve {
  protocol?: string;
  accessToken?: string;
  publicKey?: string;
  keyId?: string;
}

export interface IListStorageOptions {
  count?: number;
  next?: string;
  storageId?: string;
}

export interface ITestUser {
  id: string;
  keyPair: IKeyPair;
  accessToken: string;
  firstName?: string;
  lastName?: string;
  primaryEmail?: string;
  access?: {
    allow: { action: string; resource: string }[];
  };
  identities: { issuerId: string; subject: string }[];
}

export interface IKeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
}

export interface ITestIssuer {
  jsonKeysUrl: string;
  keys: IKeyPair[];
  getAccessToken: (index: number, subject: string) => Promise<string>;
}

// ------------------
// Internal Functions
// ------------------

export function ngrok_url(url: string) {
  // If running tests against local functions-api, replace the issuer JWKS endpoint to use Ngrok URL
  if (url.indexOf('://localhost') > 0 && process.env.LOGS_HOST && process.env.API_SERVER) {
    return url.replace(process.env.API_SERVER, `https://${process.env.LOGS_HOST}`);
  }
  return url;
}

// ------------------
// Defensively protect against function reuse
// ------------------

export interface IFunctionCatalogEntry {
  testIds: { [key: string]: number };
  boundaryId: string;
  functionId: string;
  cnt: number;
}
export interface IFunctionCatalog {
  [key: string]: IFunctionCatalogEntry;
}
export const functionCatalog: IFunctionCatalog = {};
let functionCatalogEnabled: boolean = true;

export const disableFunctionUsageRestriction = () => (functionCatalogEnabled = false);
export const enableFunctionUsageRestriction = () => (functionCatalogEnabled = true);

const onPutFunction = (boundaryId: string, functionId: string) => {
  if (!functionCatalogEnabled) {
    return;
  }
  const test = expect.getState().currentTestName;

  const key = `${boundaryId}/${functionId}`;
  if (!(key in functionCatalog)) {
    functionCatalog[key] = { testIds: { [test]: 1 }, boundaryId, functionId, cnt: 1 };
    return;
  }

  if (!functionCatalog[key].testIds[test]) {
    functionCatalog[key].testIds[test] = 1;
  } else {
    functionCatalog[key].testIds[test]++;
  }

  functionCatalog[key].cnt++;
};

// ------------------
// Exported Functions
// ------------------

export async function sleep(timeMs: number) {
  return new Promise((resolve) => setTimeout(resolve, timeMs));
}

export async function deleteFunction(account: IAccount, boundaryId: string, functionId: string) {
  return request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${functionId}`,
  });
}

export async function putFunction(
  account: IAccount,
  boundaryId: string,
  functionId: string,
  spec: any,
  options?: { tryOnce?: boolean }
): Promise<IHttpResponse> {
  onPutFunction(boundaryId, functionId);
  const response = await request({
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${functionId}`,
    data: spec,
  });

  if (response.status === 429 && !options?.tryOnce) {
    // Wait a second and try again.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return putFunction(account, boundaryId, functionId, spec);
  }

  return response;
}

export async function getBuild(account: IAccount, build: { boundaryId: string; functionId: string; buildId: string }) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${build.boundaryId}/function/${build.functionId}/build/${build.buildId}`,
  });
}

export async function startLogQuery(
  account: IAccount,
  { subscriptionId, boundaryId, functionId }: { subscriptionId?: string; boundaryId?: string; functionId?: string },
  data: { limit?: number; from?: string; to?: string; stats?: string; filter?: string }
): Promise<[string, IHttpResponse]> {
  const url = [
    `${account.baseUrl}/v1/account/${account.accountId}`,
    subscriptionId
      ? `/subscription/${subscriptionId}${
          boundaryId ? `/boundary/${boundaryId}${functionId ? `/function/${functionId}` : ``}` : ``
        }`
      : ``,
    `/logs`,
  ].join('');
  const response = await request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url,
    data,
  });
  return [url, response as IHttpResponse];
}

export async function waitForLogQuery(account: IAccount, url: string, queryId: string, timeout: number) {
  let currentWait = 2;
  let timeRemaining = timeout;
  const queryStatusUrl = `${url}/${encodeURIComponent(queryId)}`;
  while (true) {
    await sleep(currentWait * 1000);
    timeRemaining -= currentWait;
    if (timeRemaining < 0) {
      throw new Error(`The log query did not finish within the timeout.`);
    }
    if (timeout - timeRemaining > 20) {
      currentWait = 10;
    }
    const response = await request({
      method: 'GET',
      url: queryStatusUrl,
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'user-agent': account.userAgent,
      },
    });
    // console.log('DURABLE POLL QUERY RESPONSE', response.status, JSON.stringify(response.data, null, 2));
    if (response.status !== 200) {
      throw new Error(`Error running the logs query. Status code ${response.status}`);
    }
    if (response.data.status === 'complete') {
      return response.data;
    }
    if (response.data.status !== 'scheduled' && response.data.status !== 'running') {
      throw new Error(`Error running the logs query. Query status is '${response.data.status}'.`);
    }
  }
}

export async function getLogs(
  account: IAccount,
  boundaryId: string,
  functionId?: string,
  ignoreLogs: boolean = false,
  logTimeout: number = 15000
): Promise<any> {
  const http = account.baseUrl.startsWith('https') ? require('https') : require('http');
  const rootPath = `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}`;
  const boundaryPath = `/boundary/${boundaryId}`;
  const functionPath = functionId ? `/function/${functionId}` : '';
  const url = `${rootPath}${boundaryPath}${functionPath}/log`;
  const headers = { Authorization: `Bearer ${account.accessToken}`, 'user-agent': account.userAgent };

  return new Promise((resolve, reject) => {
    const bufferedResponse: any = {};
    let resolved = false;
    let timer: any = null;
    let logRequest: any = null;

    const onDone = () => {
      if (!resolved) {
        resolved = true;

        if (timer) {
          clearTimeout(timer);
        }

        if (logRequest) {
          try {
            logRequest.abort();
          } catch (error) {
            // do nothing
          }
        }

        if (bufferedResponse.status !== 200) {
          try {
            bufferedResponse.data = JSON.parse(bufferedResponse.data);
          } catch (error) {
            // do nothing
          }
        }
        resolve(bufferedResponse);
      }
    };

    const onResponse = (response: any) => {
      bufferedResponse.status = response.statusCode;
      bufferedResponse.headers = response.headers;
      bufferedResponse.data = '';

      if (ignoreLogs && bufferedResponse.status === 200) {
        onDone();
        return;
      }

      response.on('data', (data: string) => (bufferedResponse.data += data.toString()));
      response.on('end', onDone);
    };

    logRequest = http.get(url, { headers, agent: false }, onResponse);

    if (!ignoreLogs) {
      timer = setTimeout(onDone, logTimeout);
    }
  });
}

export async function waitForBuild(
  account: IAccount,
  build: { boundaryId: string; functionId: string; buildId: string },
  count: number,
  delay: number
) {
  const totalWait = count * delay;
  while (true) {
    const response = await getBuild(account, build);
    if (response.status !== 201) {
      return response;
    }
    if (count <= 0) {
      throw new Error(`Build did not complete within ${totalWait} ms`);
    }
    count--;
    await sleep(delay);
  }
}

export async function getFunction(
  account: IAccount,
  boundaryId: string,
  functionId: string,
  includeSerialized: boolean = false
) {
  const response = await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}${includeSerialized ? '?include=all' : ''}`,
  });

  return response;
}

export async function getFunctionLocation(account: IAccount, boundaryId: string, functionId: string) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${functionId}/location`,
  });
}

export async function callFunction(token: string, url: string, method: string = 'GET', data?: any) {
  return request({
    method,
    headers: {
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    url,
    data,
  });
}

export async function listFunctions(
  account: IAccount,
  boundaryId?: string,
  cron?: boolean,
  count?: number,
  search?: string | string[],
  next?: string | string[],
  includeTags?: boolean
) {
  let url = boundaryId
    ? `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function`
    : `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/function`;
  const query = [];
  if (cron !== undefined) {
    query.push(`cron=${cron}`);
  }
  if (count) {
    query.push(`count=${count}`);
  }
  if (search) {
    if (typeof search === 'string') {
      search = [search];
    }
    search.forEach((s) => query.push(`search=${s}`));
  }
  if (next) {
    if (typeof next === 'string') {
      next = [next];
    }
    next.forEach((n) => query.push(`next=${n}`));
  }
  if (includeTags) {
    query.push('include=all');
  }
  if (query.length > 0) {
    url += `?${query.join('&')}`;
  }
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url,
  });
}

export async function deleteAllFunctions(account: IAccount, boundaryId?: string) {
  const response = await listFunctions(account, boundaryId);
  expect(response).toBeHttp({ statusCode: 200 });
  return Promise.all(
    response.data.items.map((x: { boundaryId: string; functionId: string }) =>
      Promise.all([
        deleteFunction(account, x.boundaryId, x.functionId),
        removeStorage(account, `boundary/${x.boundaryId}/function/${x.functionId}`),
      ])
    )
  );
}

export async function addIssuer(account: IAccount, issuerId: string, data: any) {
  const response = await request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/issuer/${encodeURIComponent(issuerId)}`,
    data: JSON.stringify(data),
  });
  if (response.status === 200) {
    if (issuerId === 'test-issuer') {
      // Reject any successful addition of generic 'test-issuer', to prevent conflicts with other tests.
      // Instead, modify the issuer name to include a random component.
      expect(response).toBeHttp({ statusCode: 1 });
    }
    testIssuers.push(issuerId);
  }
  return response;
}

export async function listIssuers(account: IAccount, count?: number, next?: string, name?: string) {
  const queryStringParams = [];
  if (count !== undefined) {
    queryStringParams.push(`count=${count}`);
  }
  if (next !== undefined) {
    queryStringParams.push(`next=${encodeURIComponent(next)}`);
  }
  if (name !== undefined) {
    queryStringParams.push(`name=${encodeURIComponent(name)}`);
  }
  const queryString = queryStringParams.length ? `?${queryStringParams.join('&')}` : '';

  const response = await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/issuer${queryString}`,
  });
  return response;
}

export async function getIssuer(account: IAccount, issuerId: string) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/issuer/${encodeURIComponent(issuerId)}`,
  });
}

export async function updateIssuer(account: IAccount, issuerId: string, data: any) {
  const response = await request({
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/issuer/${encodeURIComponent(issuerId)}`,
    data: JSON.stringify(data),
  });
  return response;
}

export async function removeIssuer(account: IAccount, issuerId: string) {
  return request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/issuer/${encodeURIComponent(issuerId)}`,
  });
}

export async function cleanUpIssuers(account: IAccount) {
  while (testIssuers.length) {
    const toRemove = testIssuers.splice(0, 5);
    await Promise.all(toRemove.map((issuerId) => removeIssuer(account, issuerId)));
  }
}

export async function addUser(account: IAccount, data: any) {
  const response = await request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user`,
    data: JSON.stringify(data),
  });
  if (response.status === 200) {
    testUsers.push(response.data.id);
  }
  return response;
}

export async function getUser(account: IAccount, userId: string) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user/${userId}`,
  });
}

export async function listUsers(account: IAccount, options?: IListUserOptions) {
  const queryStringParams = [];
  if (options) {
    if (options.count !== undefined) {
      queryStringParams.push(`count=${options.count}`);
    }
    if (options.next !== undefined) {
      queryStringParams.push(`next=${encodeURIComponent(options.next)}`);
    }
    if (options.name !== undefined) {
      queryStringParams.push(`name=${encodeURIComponent(options.name)}`);
    }
    if (options.email !== undefined) {
      queryStringParams.push(`email=${encodeURIComponent(options.email)}`);
    }
    if (options.issuerId !== undefined) {
      queryStringParams.push(`issuerId=${encodeURIComponent(options.issuerId)}`);
    }
    if (options.subject !== undefined) {
      queryStringParams.push(`subject=${encodeURIComponent(options.subject)}`);
    }
    if (options.include === true) {
      queryStringParams.push(`include=all`);
    }
    if (options.exact === true) {
      queryStringParams.push(`exact=true`);
    }
  }
  const queryString = queryStringParams.length ? `?${queryStringParams.join('&')}` : '';

  const response = await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user${queryString}`,
  });
  return response;
}

export async function updateUser(account: IAccount, userId: string, data: any) {
  const response = await request({
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user/${userId}`,
    data: JSON.stringify(data),
  });
  return response;
}

export async function removeUser(account: IAccount, userId: string) {
  return request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user/${userId}`,
  });
}

export async function initUser(account: IAccount, userId: string, init?: IInitOptions) {
  init = init || {};
  return request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user/${userId}/init`,
    data: JSON.stringify(init),
  });
}

export async function cleanUpUsers(account: IAccount) {
  while (testUsers.length) {
    const toRemove = testUsers.splice(0, 5);
    await Promise.all(toRemove.map((userId) => removeUser(account, userId)));
  }
}

export async function addAccount(authzAccount: IAccount, newAccount: IAccountAPI): Promise<IHttpResponse> {
  return request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authzAccount.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': authzAccount.userAgent,
      'fusebit-authorization-account-id': authzAccount.accountId,
    },
    url: `${authzAccount.baseUrl}/v1/account`,
    data: JSON.stringify(newAccount),
  });
}

export async function getAccount(account: IAccount, accountId?: string) {
  const headers: IHttpRequest['headers'] = {
    Authorization: `Bearer ${account.accessToken}`,
    'Content-Type': 'application/json',
    'user-agent': account.userAgent,
  };

  if (accountId) {
    headers['fusebit-authorization-account-id'] = account.accountId;
  }

  return request({
    method: 'GET',
    headers,
    url: `${account.baseUrl}/v1/account/${accountId || account.accountId}`,
  });
}

export async function patchAccount(account: IAccount, patchedAccount: Partial<IAccountAPI>) {
  const headers: IHttpRequest['headers'] = {
    Authorization: `Bearer ${account.accessToken}`,
    'Content-Type': 'application/json',
    'user-agent': account.userAgent,
  };

  return request({
    method: 'PATCH',
    headers,
    url: `${account.baseUrl}/v1/account/${account.accountId}`,
    data: JSON.stringify(patchedAccount),
  });
}

export async function addClient(account: IAccount, data: any) {
  const response = await request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client`,
    data: JSON.stringify(data),
  });
  if (response.status === 200) {
    testClients.push(response.data.id);
  }
  return response;
}

export async function getClient(account: IAccount, clientId: string) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client/${clientId}`,
  });
}

export async function listClients(account: IAccount, options?: IListClientOptions) {
  const queryStringParams = [];
  if (options) {
    if (options.count !== undefined) {
      queryStringParams.push(`count=${options.count}`);
    }
    if (options.next !== undefined) {
      queryStringParams.push(`next=${encodeURIComponent(options.next)}`);
    }
    if (options.name !== undefined) {
      queryStringParams.push(`name=${encodeURIComponent(options.name)}`);
    }
    if (options.issuerId !== undefined) {
      queryStringParams.push(`issuerId=${encodeURIComponent(options.issuerId)}`);
    }
    if (options.subject !== undefined) {
      queryStringParams.push(`subject=${encodeURIComponent(options.subject)}`);
    }
    if (options.include === true) {
      queryStringParams.push(`include=all`);
    }
    if (options.exact === true) {
      queryStringParams.push(`exact=true`);
    }
  }
  const queryString = queryStringParams.length ? `?${queryStringParams.join('&')}` : '';

  const response = await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client${queryString}`,
  });
  return response;
}

export async function updateClient(account: IAccount, clientId: string, data: any) {
  const response = await request({
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client/${clientId}`,
    data: JSON.stringify(data),
  });
  return response;
}

export async function removeClient(account: IAccount, clientId: string) {
  return request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client/${clientId}`,
  });
}

export async function initClient(account: IAccount, clientId: string, init?: IInitOptions) {
  return request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/client/${clientId}/init`,
    data: JSON.stringify(init || {}),
  });
}

export async function cleanUpClients(account: IAccount) {
  while (testClients.length) {
    const toRemove = testClients.splice(0, 5);
    await Promise.all(toRemove.map((clientId) => removeClient(account, clientId)));
  }
}

export async function resolveInit(account: IAccount, jwt: string | undefined, initResolve: IInitResolve) {
  const headers: { [index: string]: string | undefined } = {
    'Content-Type': 'application/json',
    'user-agent': account.userAgent,
  };
  if (jwt !== undefined) {
    headers.Authorization = `Bearer ${jwt}`;
  }

  return request({
    method: 'POST',
    headers,
    url: `${account.baseUrl}/v1/account/${account.accountId}/init`,
    data: JSON.stringify(initResolve),
  });
}

export async function listAudit(account: IAccount, options?: IListAuditOptions) {
  const queryStringParams = [];
  if (options) {
    if (options.count !== undefined) {
      queryStringParams.push(`count=${options.count}`);
    }
    if (options.next !== undefined) {
      queryStringParams.push(`next=${encodeURIComponent(options.next)}`);
    }
    if (options.action !== undefined) {
      queryStringParams.push(`action=${encodeURIComponent(options.action)}`);
    }
    if (options.resource !== undefined) {
      queryStringParams.push(`resource=${encodeURIComponent(options.resource)}`);
    }
    if (options.issuerId !== undefined) {
      queryStringParams.push(`issuerId=${encodeURIComponent(options.issuerId)}`);
    }
    if (options.subject !== undefined) {
      queryStringParams.push(`subject=${encodeURIComponent(options.subject)}`);
    }
    if (options.from !== undefined) {
      queryStringParams.push(`from=${encodeURIComponent(options.from)}`);
    }
    if (options.to !== undefined) {
      queryStringParams.push(`to=${encodeURIComponent(options.to)}`);
    }
  }
  const queryString = queryStringParams.length ? `?${queryStringParams.join('&')}` : '';
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/audit${queryString}`,
  });
}

export async function listStorage(account: IAccount, options?: IListStorageOptions) {
  const queryStringParams = [];
  if (options) {
    if (options.count !== undefined) {
      queryStringParams.push(`count=${options.count}`);
    }
    if (options.next !== undefined) {
      queryStringParams.push(`next=${encodeURIComponent(options.next)}`);
    }
  }
  const queryString = queryStringParams.length ? `?${queryStringParams.join('&')}` : '';

  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/storage${
      (options && options.storageId && '/' + options.storageId) || ''
    }${queryString}`,
  });
}

export async function getStorage(account: IAccount, storageId: string) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}`,
  });
}

export async function setStorage(
  account: IAccount,
  storageId: string,
  data: any,
  etag?: string,
  skipLeadingSlash?: boolean
) {
  const headers: any = {
    Authorization: `Bearer ${account.accessToken}`,
    'Content-Type': 'application/json',
    'user-agent': account.userAgent,
  };
  if (etag) {
    headers['If-Match'] = etag;
  }

  testStorage.push(storageId);

  return request({
    method: 'PUT',
    headers,
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/storage${
      skipLeadingSlash ? '' : '/'
    }${storageId}`,
    data: JSON.stringify(data),
  });
}

export async function removeStorage(account: IAccount, storageId: string, etag?: string) {
  const headers: any = {
    Authorization: `Bearer ${account.accessToken}`,
    'Content-Type': 'application/json',
    'user-agent': account.userAgent,
  };
  if (etag) {
    headers['If-Match'] = etag;
  }
  return request({
    method: 'DELETE',
    headers,
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storageId}`,
  });
}

export async function cleanUpStorage(account: IAccount) {
  while (testStorage.length) {
    const toRemove = testStorage.splice(0, 5);
    await Promise.all(toRemove.map((storageId) => removeStorage(account, storageId)));
  }
}

export async function createTestUser(account: IAccount, data: any): Promise<ITestUser> {
  const user = await addUser(account, data);
  expect(user).toBeHttp({ statusCode: 200 });

  const init = await initUser(account, user.data.id);
  expect(init).toBeHttp({ statusCode: 200 });

  const keyPairs = await createKeyPairs(1);
  const keyPair = keyPairs[0];
  const resolved = await resolveInit(account, init.data, { publicKey: keyPair.publicKey, keyId: keyPair.keyId });
  expect(resolved).toBeHttp({ statusCode: 200 });

  const accessToken = await generateAccessToken(
    account.audience,
    keyPairs[0],
    resolved.data.identities[0].issuerId,
    resolved.data.identities[0].subject
  );

  return {
    id: user.data.id,
    keyPair: keyPairs[0],
    accessToken,
    firstName: user.data.firstName,
    lastName: user.data.lastName,
    primaryEmail: user.data.primaryEmail,
    access: user.data.access,
    identities: resolved.data.identities,
  };
}

export interface IStatisticsScope {
  accountId: string;
  subscriptionId?: string;
  boundaryId?: string;
}

// export async function clearStatistics(username: string, password: string, hostname: string) {
//  return request({
//    method: 'DELETE',
//    headers: {
//      'Content-Type': 'application/json',
//    },
//    auth: {
//      username: username,
//      password: password,
//    },
//    query: params,
//    url: `https://${hostname}/fusebit-*`,
//  });
// }

export async function statisticsEnabled(account: IAccount): Promise<boolean> {
  const response = await getStatistics(account, 'itemizedbulk', { accountId: account.accountId }, () => true, {
    from: new Date(),
    to: new Date(),
    code: 200,
  });

  if (response.status === 200) {
    return true;
  }
  expect(response.status).toEqual(405);
  console.warn('ElasticSearch Not Supported');
  return false;
}

export async function getStatistics(
  account: IAccount,
  statisticsKey: string,
  scope: IStatisticsScope,
  retryTest: (response: IHttpResponse) => boolean,
  params?: any
): Promise<IHttpResponse> {
  let url = `${account.baseUrl}/v1/account/${account.accountId}`;

  if (scope.subscriptionId) {
    url = url + `/subscription/${scope.subscriptionId}`;
    if (scope.boundaryId) {
      url = url + `/boundary/${scope.boundaryId}`;
    }
  }
  url = url + `/statistics/${statisticsKey}`;

  const fiveMin = 5 * 60 * 1000;
  const fifteenMin = 3 * fiveMin;

  if (!params) {
    params = {
      to: new Date(Date.now() + fiveMin),
      from: new Date(Date.now() - fifteenMin),
      code: 200,
    };
  } else {
    if (params.to === undefined) {
      params.to = new Date(Date.now() + fiveMin);
    }

    if (params.from === undefined) {
      params.from = new Date(Date.now() - fifteenMin);
    }
  }

  let response: any;
  const maxRetryCount = 10;
  let retries = 0;

  // Poll for the test criteria to be satisfied, or a maximum interval.
  do {
    if (retries !== 0) {
      await new Promise((resolve, reject) => setTimeout(() => resolve(), 1000));
    }
    response = await request({
      method: 'GET',
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
      query: params,
      url,
    });
    retries++;
  } while (!retryTest(response) && retries < maxRetryCount);

  if (retries === maxRetryCount) {
    throw new Error('Exceeded the number of allowed retries');
  }

  return response;
}

export async function createTestJwksIssuer(account: IAccount) {
  const keyPairs = await createKeyPairs(2);
  const jwksKeys = await createJwksKeys(keyPairs);
  const issuerId = `issuer-${random({ lengthInBytes: 8 })}`;
  const jsonKeysUrl = await hostIssuer(account, issuerId, jwksKeys);

  await addIssuer(account, issuerId, { jsonKeysUrl });

  const getAccessToken = async (subject: string) => {
    return generateAccessToken(account.audience, keyPairs[0], issuerId, subject);
  };

  return { issuerId, keys: keyPairs, getAccessToken };
}

export async function hostIssuer(account: IAccount, issuerId: string, keys: any) {
  const issuerSpec = {
    nodejs: {
      files: {
        'index.js': `module.exports = (ctx, cb) => cb(null, { body: ${JSON.stringify(keys)} });`,
      },
    },
  };

  const result = await putFunction(account, hostedIssuersBoundary, issuerId, issuerSpec);
  expect(result).toBeHttp({ statusCode: 200 });

  testHostedIssuers.push(issuerId);

  result.data.location = ngrok_url(result.data.location);

  return result.data.location;
}

export async function cleanUpHostedIssuers(account: IAccount) {
  while (testHostedIssuers.length) {
    const toRemove = testHostedIssuers.splice(0, 5);
    await Promise.all(toRemove.map((functionId) => deleteFunction(account, hostedIssuersBoundary, functionId)));
  }
  await cleanUpIssuers(account);
}

export async function createJwksKeys(keyPairs: IKeyPair[]) {
  const keys = [];
  for (const key of keyPairs) {
    const jwk = pem2jwk(key.publicKey);
    keys.push({
      alg: 'RS512',
      kty: 'RSA',
      use: 'sig',
      n: jwk.n,
      e: jwk.e,
      kid: key.keyId,
    });
  }
  return { keys };
}

export async function createKeyPairs(count: number) {
  const keyPairs = [];
  for (let i = 0; i < count; i++) {
    const keyPair = await createKeyPair();
    keyPairs.push({
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      keyId: random({ lengthInBytes: 8 }) as string,
    });
  }

  return keyPairs;
}

export async function generateAccessToken(audience: string, keyPair: IKeyPair, issuerId: string, subject: string) {
  const options = {
    algorithm: 'RS256',
    expiresIn: 600,
    audience,
    issuer: issuerId,
    subject,
    keyid: keyPair.keyId,
    header: {
      jwtId: random(),
    },
  };

  return signJwt({}, keyPair.privateKey, options);
}

export async function createPKIAccessToken(
  keyPair: IKeyPairResult,
  keyId: string,
  issuerId: string,
  subject: string,
  audience: string
) {
  const options = {
    algorithm: 'RS256',
    expiresIn: 600,
    audience,
    issuer: issuerId,
    subject,
    keyid: keyId,
    header: {
      jwtId: random(),
    },
  };

  return signJwt({}, keyPair.privateKey, options);
}

export async function getFunctionRedirect(account: IAccount, boundaryId: string, functionId: string) {
  const response = await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${functionId}/redirect`,
  });

  return response;
}

export async function deleteFunctionRedirect(account: IAccount, boundaryId: string, functionId: string) {
  const response = await request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${functionId}/redirect`,
  });

  return response;
}

export async function postFunctionRedirect(
  account: IAccount,
  boundaryId: string,
  functionId: string,
  redirectUrl: string
) {
  const response = await request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${boundaryId}/function/${functionId}/redirect`,
    data: JSON.stringify({ redirectUrl }),
  });

  return response;
}

export async function getMe(account: IAccount, accessToken?: string) {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken || account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/me`,
  });
}

export async function getSubscription(account: IAccount, subscriptionId?: string, include?: 'cache') {
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${subscriptionId || account.subscriptionId}${
      include ? '?include=cache' : ''
    }`,
  });
}

async function refreshInstanceCache(account: IAccount) {
  const MAX_TEST_DELAY = Constants.MAX_CACHE_REFRESH_RATE * 5;
  const startTime = Date.now();
  do {
    const refreshResponse = await request({
      method: 'GET',
      headers: {
        'user-agent': account.userAgent,
      },
      url: `${account.baseUrl}/v1/refresh`,
    });
    expect(refreshResponse).toBeHttp({ statusCode: 200 });
    const { at } = refreshResponse.data;
    if (at > startTime) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, Constants.MAX_CACHE_REFRESH_RATE - (Date.now() - at)));
  } while (Date.now() < startTime + MAX_TEST_DELAY);

  throw new Error(`ERROR: Unable to refresh the subscription: ${account.subscriptionId}. Tests will fail.`);
}

export async function refreshSubscriptionCache(account: IAccount) {
  const workAroundNumberOfInstances = 10;
  const refreshCalls = Array.from(Array(workAroundNumberOfInstances).keys()).map(() => refreshInstanceCache(account));
  return Promise.all(refreshCalls);
}

export async function waitForTask(
  account: IAccount,
  boundaryId: string,
  functionId: string,
  taskUrl: string,
  attempts: number = 60
) {
  while (attempts === undefined || attempts > 0) {
    await new Promise((r) => setTimeout(r, 1000));
    const response = await request({
      method: 'GET',
      url: taskUrl,
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
      },
    });
    expect(response).toBeHttp({
      statusCode: 200,
      data: {
        accountId: account.accountId,
        subscriptionId: account.subscriptionId,
        boundaryId,
        functionId,
        transitions: {},
      },
    });
    expect(response.data.taskId).toMatch(/^tsk-/);
    expect(response.data.status).toMatch(/^pending|running|completed|error$/);
    if (response.data.status === 'completed') {
      expect(response.data.output).toMatchObject({
        response: {},
        meta: {},
      });
    } else if (response.data.status === 'error') {
      expect(response.data.error).toMatchObject({});
    }
    if (response.data.status === 'error' || response.data.status === 'completed') {
      return response.data;
    }
    if (attempts) {
      attempts--;
      if (attempts === 0) {
        return response.data;
      }
    }
  }
}
