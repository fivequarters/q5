import { createKeyPair } from '@5qtrs/key-pair';
import { decodeJwt, signJwt, verifyJwt } from '../src';

describe('signJwt', () => {
  it('should create a JWT', async () => {
    const secret = 'this is a secret';
    const jwt = await signJwt({ foo: 'bar' }, secret, { issuer: 'abcd', audience: '1234' });
    const decoded = await verifyJwt(jwt, secret);
    expect(decoded.foo).toBe('bar');
    expect(decoded.aud).toBe('1234');
    expect(decoded.iss).toBe('abcd');
    expect(typeof decoded.iat).toBe('number');
  });

  it('should support a key pair', async () => {
    const keys = await createKeyPair();
    const jwt = await signJwt({ foo: 'bar' }, keys.privateKey, {
      issuer: 'abcd',
      audience: '1234',
      algorithm: 'RS256',
    });
    const decoded = await verifyJwt(jwt, keys.publicKey);
    expect(decoded.foo).toBe('bar');
    expect(decoded.aud).toBe('1234');
    expect(decoded.iss).toBe('abcd');
    expect(typeof decoded.iat).toBe('number');
  });
});

describe('decodeJwt', () => {
  it('should deocde the JWT', async () => {
    const secret = 'this is a secret';
    const jwt = await signJwt({ foo: 'bar' }, secret, { issuer: 'abcd', audience: '1234' });
    const decoded = decodeJwt(jwt);
    expect(decoded).toBeDefined();
    if (decoded) {
      expect(decoded.foo).toBe('bar');
      expect(decoded.aud).toBe('1234');
      expect(decoded.iss).toBe('abcd');
      expect(typeof decoded.iat).toBe('number');
    }
  });
});
