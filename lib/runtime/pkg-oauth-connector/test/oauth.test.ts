import { FusebitManager, IStorage } from '@fusebit-int/pkg-manager';
import router from '../src/OAuthManager';

const request = (method: string, path: string, params: any) => {
  return { body: {}, headers: {}, method, path, params };
};

const sampleCfg = {
  authorizationUrl: 'http://AUTHURL',
  scope: 'SCOPES',
  clientId: 'CLIENTID',
  mountUrl: 'https://BASEURL/foo/bar',
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

describe('Example', () => {
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

  it('/callback stores a token', async () => {
    const manager = new FusebitManager(storage);
    manager.setup(router, undefined, sampleCfg);

    let result = await manager.handle(request('GET', '/configure', { state: 'STATE' }));
    const url = new URL(result.header.location);
    const redirectUri = url.searchParams.get('redirect_uri') as string;
    const path = redirectUri.substring(sampleCfg.mountUrl.length);
    result = await manager.handle(request('GET', path, {}));
    /* XXX check the result value? */
    console.log(result);
    console.log(JSON.stringify(memStorage));
  });
});
