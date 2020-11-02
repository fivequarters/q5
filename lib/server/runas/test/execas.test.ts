import { verifyJwt } from '@5qtrs/jwt';

import { KeyStore, KEYSTORE_DEFAULT_ALG } from '../src/KeyStore';

import { startExpress } from './server';

import { execAs } from '../src/ExecAs';

import superagent from 'superagent';

let globalServer: any;

const globalParams = {
  accountId: 'acc-00000000',
  subscriptionId: 'sub-11111111',
  boundaryId: 'bndid',
  functionId: 'fncid',
};

let functionSummary = {};

beforeEach(async () => {
  const ks = new KeyStore();
  const keyPair = await ks.rekey();
  ks.setKeyPair(keyPair);
  const authorize = (options: any) => (req: any, res: any) => ({});
  globalServer = await startExpress((app: any): void => {
    app.get('/exec/:accountId/:subscriptionId/:boundaryId/:functionId', (req: any, res: any, next: any) => {
      req.functionSummary = functionSummary;
      console.log(`metadata ${req.url} ${JSON.stringify(req.params)} ${JSON.stringify(req.functionSummary)}`);
      return next();
    });
    app.get('/exec/:accountId/:subscriptionId/:boundaryId/:functionId', execAs(authorize, ks));
  });
  globalServer.ks = ks;
});

afterEach(async () => {
  globalServer.forceClose();
  await new Promise((resolve, reject) => globalServer.server.close(resolve));
});

describe('keystore', () => {
  it('execAs', async () => {
    const { app, ks, server, forceClose, port, url } = globalServer;
    const perm = ['function:*::/'];
    process.env.API_SERVER = url;
    functionSummary = { 'compute.permissions': perm };

    app.get('/', (req: any, res: any) => {
      expect(req.headers.authorization).toBeUndefined();
      res.status(200).json({});
    });

    app.get('/exec/:accountId/:subscriptionId/:boundaryId/:functionId', async (req: any, res: any) => {
      const jwt = req.headers.authorization;
      expect(jwt).not.toBeUndefined();
      const result = await verifyJwt(jwt, ks.getPublicKey().publicKey);
      expect(result.sub).toBeDefined();
      expect(result.kid).toBeDefined();
      expect(result.perm).toEqual(perm);
      expect(result.aud).toBe(url);
      expect(result.iss).toBe(url + '/issuer');
      expect(result.iat).toBeGreaterThan(Date.now() - 1000);
      expect(result.iat).toBeLessThan(Date.now() + 1000);
      expect(result.exp).toBeGreaterThan(Date.now());
      res.status(200).json({});
    });

    await superagent.get(
      [
        url,
        'exec',
        globalParams.accountId,
        globalParams.subscriptionId,
        globalParams.boundaryId,
        globalParams.functionId,
      ].join('/')
    );
  });
});
