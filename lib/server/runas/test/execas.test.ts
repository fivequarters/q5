import { verifyJwt, decodeJwt } from '@5qtrs/jwt';
import * as Constants from '@5qtrs/constants';

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

const setFunctionSummary = (req: any, res: any, next: any) => {
  req.functionSummary = functionSummary;
  return next();
};

beforeEach(async () => {
  const ks = new KeyStore();
  const keyPair = await ks.rekey();
  ks.setKeyPair(keyPair);
  globalServer = await startExpress();
  globalServer.ks = ks;
});

afterEach(async () => {
  globalServer.forceClose();
  await new Promise((resolve, reject) => globalServer.server.close(resolve));
});

describe('keystore', () => {
  it('execAs', async () => {
    const { app, ks, server, forceClose, port, url } = globalServer;
    const perm = { allow: [{ action: 'function:*', resource: '/' }] };
    process.env.API_SERVER = url;
    functionSummary = { 'compute.permissions': perm };

    app.get('/', (req: any, res: any) => {
      expect(req.params.functionAccessToken).toBeUndefined();
      res.status(200).json({});
    });

    app.get(
      '/exec/:accountId/:subscriptionId/:boundaryId/:functionId',
      setFunctionSummary,
      execAs(ks),
      async (req: any, res: any) => {
        const jwt = req.params.functionAccessToken;
        expect(jwt).not.toBeUndefined();
        const valid = await verifyJwt(jwt, ks.getPublicKey().publicKey);
        const result = await decodeJwt(jwt, false, true);
        expect(result.payload.sub).toBeDefined();
        expect(result.header.kid).toBeDefined();
        expect(result.payload[Constants.JWT_PERMISSION_CLAIM]).toEqual(perm);
        expect(result.payload.aud).toBe(url);
        expect(Constants.isSystemIssuer(result.payload.iss)).toBeTruthy();
        expect(result.payload.iat).toBeGreaterThan((Date.now() - 1000) / 1000);
        expect(result.payload.iat).toBeLessThan((Date.now() + 1000) / 1000);
        expect(result.payload.exp).toBeGreaterThan(Date.now() / 1000);
        res.status(200).json({});
      }
    );

    const response = await superagent.get(
      [
        url,
        'exec',
        globalParams.accountId,
        globalParams.subscriptionId,
        globalParams.boundaryId,
        globalParams.functionId,
      ].join('/')
    );
    expect(response.status).toBe(200);
  });
});
