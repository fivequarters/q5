require('dotenv').config();

import { IAccount } from './accountResolver';
import { request } from '@5qtrs/request';
import { random } from '@5qtrs/random';
import { signJwt } from '@5qtrs/jwt';
import { createKeyPair } from '@5qtrs/key-pair';
import { pem2jwk } from 'pem-jwk';

// ------------------
// Internal Constants
// ------------------

const testUsers: string[] = [];
const testClients: string[] = [];
const testIssuers: string[] = [];
const testHostedIssuers: string[] = [];
const testStorage: string[] = [];

const hostedIssuersBoundary = 'test-issuers';

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
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

export interface IInitResolve {
  publicKey?: string;
  keyId?: string;
}

export interface IListStorageOptions {
  count?: number;
  next?: string;
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

function ngrok_url(url: string) {
  // If running tests against local functions-api, replace the issuer JWKS endpoint to use Ngrok URL
  if (url.indexOf('://localhost') > 0 && process.env.LOGS_HOST && process.env.API_SERVER) {
    return url.replace(process.env.API_SERVER, `https://${process.env.LOGS_HOST}`);
  }
  return url;
}

// ------------------
// Exported Functions
// ------------------

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function deleteFunction(account: IAccount, boundaryId: string, functionId: string) {
  return await request({
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}`,
  });
}

export async function putFunction(account: IAccount, boundaryId: string, functionId: string, spec: any) {
  return await request({
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}`,
    data: spec,
  });
}

export async function getBuild(account: IAccount, build: { boundaryId: string; functionId: string; buildId: string }) {
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/boundary/${
      build.boundaryId
    }/function/${build.functionId}/build/${build.buildId}`,
  });
}

export async function getLogs(
  account: IAccount,
  boundaryId: string,
  functionId?: string,
  ignoreLogs: boolean = false
): Promise<any> {
  const http = account.baseUrl.startsWith('https') ? require('https') : require('http');
  const rootPath = `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}`;
  const boundaryPath = `/boundary/${boundaryId}`;
  const functionPath = functionId ? `/function/${functionId}` : '';
  const url = `${rootPath}${boundaryPath}${functionPath}/log`;
  const headers = { Authorization: `Bearer ${account.accessToken}`, 'user-agent': account.userAgent };

  return new Promise((resolve, reject) => {
    let bufferedResponse: any = {};
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
      timer = setTimeout(onDone, 10000);
    }
  });
}

export async function waitForBuild(
  account: IAccount,
  build: { boundaryId: string; functionId: string; buildId: string },
  count: number,
  delay: number
) {
  let totalWait = count * delay;
  while (true) {
    let response = await getBuild(account, build);
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
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}${includeSerialized ? '?include=all' : ''}`,
  });
}

export async function getFunctionLocation(account: IAccount, boundaryId: string, functionId: string) {
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/boundary/${boundaryId}/function/${functionId}/location`,
  });
}

export async function listFunctions(
  account: IAccount,
  boundaryId?: string,
  cron?: boolean,
  count?: number,
  next?: string
) {
  let url = boundaryId
    ? `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
        account.subscriptionId
      }/boundary/${boundaryId}/function`
    : `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/function`;
  let query = [];
  if (cron !== undefined) {
    query.push(`cron=${cron}`);
  }
  if (count) {
    query.push(`count=${count}`);
  }
  if (next) {
    query.push(`next=${next}`);
  }
  if (query.length > 0) {
    url += `?${query.join('&')}`;
  }
  return await request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'user-agent': account.userAgent,
    },
    url,
  });
}

export async function deleteAllFunctions(account: IAccount, boundaryId?: string) {
  let response = await listFunctions(account, boundaryId);
  if (response.status !== 200) {
    throw new Error(
      `Unable to list functions in account ${account.accountId}, subscription ${
        account.subscriptionId
      }, boundary ${boundaryId || '*'} on deployment ${account.baseUrl}.`
    );
  }
  return Promise.all(
    response.data.items.map((x: { boundaryId: string; functionId: string }) =>
      deleteFunction(account, x.boundaryId, x.functionId)
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
    await Promise.all(toRemove.map(issuerId => removeIssuer(account, issuerId)));
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
  return request({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/user/${userId}/init`,
    data: JSON.stringify(init || {}),
  });
}

export async function cleanUpUsers(account: IAccount) {
  while (testUsers.length) {
    const toRemove = testUsers.splice(0, 5);
    await Promise.all(toRemove.map(userId => removeUser(account, userId)));
  }
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
    await Promise.all(toRemove.map(clientId => removeClient(account, clientId)));
  }
}

export async function resolveInit(account: IAccount, jwt: string | undefined, initResolve: IInitResolve) {
  const headers: { [index: string]: string | undefined } = {
    'Content-Type': 'application/json',
    'user-agent': account.userAgent,
  };
  if (jwt !== undefined) {
    headers['Authorization'] = `Bearer ${jwt}`;
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
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${
      account.subscriptionId
    }/storage${queryString}`,
  });
}

export async function getStorage(account: IAccount, storageId: string, storagePath?: string) {
  const storage = storagePath ? `${storageId}/${storagePath}` : storageId;
  return request({
    method: 'GET',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'user-agent': account.userAgent,
    },
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storage}`,
  });
}

export async function setStorage(account: IAccount, storageId: string, data: any, etag?: string, storagePath?: string) {
  const storage = storagePath ? `${storageId}/${storagePath}` : storageId;
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
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storage}`,
    data: JSON.stringify(data),
  });
}

export async function removeStorage(account: IAccount, storageId: string, etag?: string, storagePath?: string) {
  const storage = storagePath ? `${storageId}/${storagePath}` : storageId;
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
    url: `${account.baseUrl}/v1/account/${account.accountId}/subscription/${account.subscriptionId}/storage/${storage}`,
  });
}

export async function cleanUpStorage(account: IAccount) {
  while (testStorage.length) {
    const toRemove = testStorage.splice(0, 5);
    await Promise.all(toRemove.map(storageId => removeStorage(account, storageId)));
  }
}

export async function createTestUser(account: IAccount, data: any): Promise<ITestUser> {
  const user = await addUser(account, data);
  if (user.status !== 200) {
    throw new Error(`Failed to add test user: ${user.data ? user.data.message : '<no data>'}`);
  }

  const init = await initUser(account, user.data.id);
  if (init.status !== 200) {
    throw new Error(`Failed to init test user: ${init.data ? init.data.message : '<no data>'}`);
  }

  const keyPairs = await createKeyPairs(1);
  const keyPair = keyPairs[0];
  const resolved = await resolveInit(account, init.data, { publicKey: keyPair.publicKey, keyId: keyPair.keyId });
  if (resolved.status !== 200) {
    throw new Error(
      `Failed to resolve init token for test user: ${resolved.data ? resolved.data.message : '<no data>'}`
    );
  }

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
  if (result.status !== 200) {
    throw new Error('Failed to create issuers function');
  }

  testHostedIssuers.push(issuerId);

  result.data.location = ngrok_url(result.data.location);

  return result.data.location;
}

export async function cleanUpHostedIssuers(account: IAccount) {
  while (testHostedIssuers.length) {
    const toRemove = testHostedIssuers.splice(0, 5);
    await Promise.all(toRemove.map(functionId => deleteFunction(account, hostedIssuersBoundary, functionId)));
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
    subject: subject,
    keyid: keyPair.keyId,
    header: {
      jwtId: random(),
    },
  };

  return signJwt({}, keyPair.privateKey, options);
}
