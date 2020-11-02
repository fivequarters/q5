import { verifyJwt } from '@5qtrs/jwt';

import { KeyStore, KEYSTORE_DEFAULT_ALG } from '../src/KeyStore';

import { startExpress } from './server';

import { execAs } from '../src/ExecAs';

describe('keystore', () => {
  it('create', async () => {
    const ks = new KeyStore();
    await expect(ks.signJwt({})).rejects.toThrow('secret');
    const keyPair = await ks.rekey();
    ks.setKeyPair(keyPair);
    expect(keyPair.ttl).toBeGreaterThan(Date.now());
    expect(keyPair.kid).toHaveLength(8);
    const jwt = await ks.signJwt({});
    const result = await verifyJwt(jwt, keyPair.publicKey);
    expect(result.iat).toBeLessThan(Date.now());
    expect(result.exp).toBeGreaterThan(Date.now());
  });
});
