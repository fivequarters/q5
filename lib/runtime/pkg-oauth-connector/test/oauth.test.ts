import superagent from 'superagent';

import { FusebitManager, IStorage } from '@fusebit-int/pkg-manager';
import router from '../src/OAuthManager';
import { IOAuthConfig } from '../src/Common';

import { httpMockStart } from './server';

const request = (method: string, path: string, params: any) => {
  return { body: {}, headers: {}, method, path, params };
};

const sampleCfg: IOAuthConfig = {
  mountUrl: 'https://BASEURL',

  authorizationUrl: 'http://AUTHURL',
  tokenUrl: 'http://TOKENURL',
  scope: 'SCOPES',
  clientId: 'CLIENTID',
  clientSecret: 'CLIENTSECRET',
  audience: 'AUDIENCE',
  vendorPrefix: 'VENDORPREFIX',
  extraParams: 'EXTRAPARAMS',
  accessTokenExpirationBuffer: 500,
  refreshErrorLimit: 100000,
  refreshWaitCountLimit: 100000,
  refreshInitialBackoff: 100000,
  refreshBackoffIncrement: 100000,
};

let memStorage: { [key: string]: any } = {};

const storage: IStorage = {
  get: async (key: string) => memStorage[key],
  put: async (data: any, key: string) => {
    memStorage[key] = data;
  },
  delete: async (key: string | undefined, flag?: boolean) => {
    if (flag) {
      memStorage = {};
    } else if (key) {
      delete memStorage[key];
    }
  },
};

describe('OAuth Engine', () => {
  it('/configure generates a valid redirect', async () => {
    const manager = new FusebitManager(storage);
    manager.setup(router, undefined, sampleCfg);

    // A request for 'GET /configure':
    const result = await manager.handle(request('GET', '/configure', { state: 'STATE' }));
    expect(result.statusCode).toBe(302);
    expect(result.header.location).toMatch(/STATE/);
    expect(result.header.location).toMatch(/AUTHURL/);
    expect(result.header.location).toMatch(/SCOPES/);
    expect(result.header.location).toMatch(/CLIENTID/);
    expect(result.header.location).toMatch(/BASEURL/);
    expect(result.header.location).toMatch(/callback/);
    expect(result.header.location).toMatch(new RegExp(encodeURIComponent(sampleCfg.mountUrl)));

    const url = new URL(result.header.location);
    const redirectUri = url.searchParams.get('redirect_uri') as string;
    expect(redirectUri).not.toBeNull();
  });

  it('/callback retrieves a token', async () => {
    const httpMockEnd = httpMockStart(sampleCfg);
    const manager = new FusebitManager(storage);
    manager.setup(router, undefined, sampleCfg);

    let result = await manager.handle(request('GET', '/configure', { state: 'STATE' }));

    // Simulate hitting the OAuth server.
    const codeRedirect = await superagent.get(result.header.location);
    expect(codeRedirect.status).toBe(302);

    // Extract the search parameters out of the URL from the OAuth server
    const url = new URL(codeRedirect.header.location);
    const params = [...url.searchParams.keys()].reduce((obj: { [key: string]: string | null }, key: string) => {
      obj[key] = url.searchParams.get(key);
      return obj;
    }, {});

    // Simulate the callback from the OAuth server back to Fusebit
    result = await manager.handle(request('GET', url.pathname, params));
    expect(result.statusCode).toBe(200);
    expect(result.body.access_token).toBe('ACCESSTOKEN');
    expect(result.body.refresh_token).toBe('REFRESHTOKEN');
    expect(result.body.token_type).toBe('Bearer');
    expect(result.body.expires_in).toBe(3600);
    expect(result.body.expires_at).toBeGreaterThan(1618292158939);
    expect(result.body.status).toBe('authenticated');
    expect(result.body.timestamp).toBeGreaterThan(1618288558939);
    httpMockEnd();
  });
});
