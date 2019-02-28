import { createKeyPair } from '../src';
import crypto from 'crypto';

describe('creatKeyPair', () => {
  it('should return a new key pair by default', async () => {
    const keys = await createKeyPair();

    expect(typeof keys.publicKey).toBe('string');
    expect(typeof keys.privateKey).toBe('string');
    expect(keys.publicKey).toContain('-----BEGIN PUBLIC KEY-----\n');
    expect(keys.privateKey).toContain('-----BEGIN PRIVATE KEY-----\n');
  });

  it('should return a new key pair that can sign and verify', async () => {
    const keys = await createKeyPair();
    const sign = crypto.createSign('SHA256');
    sign.update('some data to sign');
    sign.end();
    const signature = sign.sign(keys.privateKey);

    const verify = crypto.createVerify('SHA256');
    verify.update('some data to sign');
    verify.end();

    expect(verify.verify(keys.publicKey, signature)).toBe(true);
  });
});
