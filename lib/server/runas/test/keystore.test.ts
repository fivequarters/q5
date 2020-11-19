import { verifyJwt } from '@5qtrs/jwt';
import * as Constants from '@5qtrs/constants';

import { KeyStore, KEYSTORE_MAX_KEY_TTL, KEYSTORE_JWT_VALIDITY, KEYSTORE_DEFAULT_ALG } from '../src/KeyStore';

import { startExpress } from './server';

import { execAs } from '../src/ExecAs';

describe('keystore', () => {
  it('create', async () => {
    const ks = new KeyStore();
    await expect(ks.signJwt({})).rejects.toThrow('create');
    const keyPair = await ks.rekey();
    ks.setKeyPair(keyPair);
    const nowms = Date.now();
    expect(keyPair.ttl).toBeGreaterThanOrEqual(nowms);
    expect(keyPair.ttl).toBeLessThanOrEqual(nowms + KEYSTORE_MAX_KEY_TTL);
    expect(keyPair.kid).toHaveLength(Constants.RUNAS_KID_LEN * 2);
    const jwt = await ks.signJwt({});
    const result = await verifyJwt(jwt, keyPair.publicKey);
    const now = Date.now() / 1000;
    expect(result.iat).toBeGreaterThan(now - 5);
    expect(result.iat).toBeLessThan(now);
    expect(result.exp).toBeGreaterThan(now);
    expect(result.exp).toBeLessThan(KEYSTORE_JWT_VALIDITY / 1000 + now);
  });
});
