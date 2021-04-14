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
  callbackUrl: 'https://BASEURL/callback',

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

const convertToRequest = (location: string) => {
  const url = new URL(location);
  const params = [...url.searchParams.keys()].reduce((obj: { [key: string]: string | null }, key: string) => {
    obj[key] = url.searchParams.get(key);
    return obj;
  }, {});

  return request('GET', url.pathname, params);
};

beforeEach(() => {
  memStorage = {};
});

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
});

describe('Simple OAuth Tests', () => {
  let httpMockEnd: any;

  beforeAll(() => {
    httpMockEnd = httpMockStart(sampleCfg);
  });

  afterAll(() => {
    httpMockEnd();
  });

  it('Simple end-to-end flow', async () => {
    const manager = new FusebitManager(storage); // Start the manager with a pseudo-storage
    manager.setup(router, undefined, sampleCfg); // Configure the system.

    // Start the process with the browser hitting the connector with a state value.
    let result = await manager.handle(request('GET', '/configure', { state: 'STATE' }));

    // Simulate hitting the OAuth server.
    const codeRedirect = await superagent.get(result.header.location);
    expect(codeRedirect.status).toBe(302);

    // Simulate the browser hitting the connector; the connector then calls into the OAuth server to convert
    // the code into an access token.
    result = await manager.handle(convertToRequest(codeRedirect.header.location));
    expect(result.statusCode).toBe(200);

    // Validate the result
    expect(result.body).toMatchObject({
      access_token: 'ACCESSTOKEN',
      refresh_token: 'REFRESHTOKEN',
      token_type: 'Bearer',
      expires_in: 3600,
      status: 'authenticated',
    });
    expect(result.body.expires_at).toBeGreaterThan(1618292158939);
    expect(result.body.timestamp).toBeGreaterThan(1618288558939);

    // Validate memStorage
    expect(memStorage).toEqual({ STATE: result.body });
  });
});

describe('Test against mocklab.io', () => {
  it('example', async () => {
    const mockCfg: IOAuthConfig = {
      mountUrl: 'https://BASEURL',
      callbackUrl: 'https://BASEURL/callback',

      authorizationUrl: 'https://oauth.mocklab.io/oauth/authorize',
      tokenUrl: 'https://oauth.mocklab.io/oauth/token',
      scope: 'email',
      clientId: 'mocklab_oauth2',
      clientSecret: 'whatever',
      accessTokenExpirationBuffer: 500,
      refreshErrorLimit: 100000,
      refreshWaitCountLimit: 100000,
      refreshInitialBackoff: 100000,
      refreshBackoffIncrement: 100000,
    };

    const manager = new FusebitManager(storage); // Start the manager with a pseudo-storage
    manager.setup(router, undefined, mockCfg); // Configure the system.

    // Start the process with the browser hitting the connector with a state value.
    let result = await manager.handle(request('GET', '/configure', { state: 'STATE' }));

    const res = await superagent
      .post('https://oauth.mocklab.io/login')
      .send(
        `state=STATE&redirectUri=${mockCfg.mountUrl}/callback&cliendId=foo&nonce=bar&email=user@example.com&password=monkey`
      )
      .redirects(0)
      .ok((r: superagent.Response) => r.status < 400);
    expect(res.status).toBe(302);
    expect(res.header.location.indexOf(`${mockCfg.mountUrl}/callback`)).toBe(0);

    // Simulate hitting the fusebit callback url
    result = await manager.handle(convertToRequest(res.header.location));

    expect(result.body.access_token.length).toBeGreaterThan(1);
    expect(result.body.token_type).toBe('Bearer');
    expect(result.body.id_token.length).toBeGreaterThan(1);
    expect(result.body.status).toBe('authenticated');
    expect(result.body.timestamp).toBeGreaterThan(1);
  });
});
