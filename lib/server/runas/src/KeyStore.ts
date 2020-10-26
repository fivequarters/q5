import { IFunctionParams, IFunctionPermission } from './Request';

import { signJwt, verifyJwt } from '@5qtrs/jwt';

import { createKeyPair } from '@5qtrs/key-pair';

import * as crypto from 'crypto';

const KEYSTORE_MAX_KEY_TTL = 12 * 60 * 60 * 1000; // 12 hrs
const KEYSTORE_MIN_WINDOW = 5 * 60 * 1000; // 5 minutes

interface IKeyPair {
  kid: string;
  publicKey: string;
  privateKey?: string;
  ttl: number;
}

class KeyStore {
  private keyPairs: IKeyPair[];

  constructor(instanceId: string) {
    this.keyPairs = [];
  }

  public async signJwt(payload: any): Promise<string> {
    this.sweep();
    const key = this.keyPairs[0];

    payload.aud = `${process.env.API_SERVER}`;
    payload.iss = `${process.env.API_SERVER}/issuer`;
    payload.kid = key.kid;
    payload.iat = Date.now();
    payload.exp = Date.now() + KEYSTORE_MIN_WINDOW;

    return signJwt(payload, key.privateKey as string);
  }

  public async verifyJwt(token: string): Promise<any> {
    this.sweep();

    // Figure out which keypair it relates to
    return verifyJwt(token, this.keyPairs[0].privateKey as string);
  }

  public sweep() {
    const now = Date.now();
    this.keyPairs = this.keyPairs.filter((e) => e.ttl < now - KEYSTORE_MIN_WINDOW);
  }

  public async rekey(ttl: number = KEYSTORE_MAX_KEY_TTL): Promise<{ publicKey: string; kid: string }> {
    const { publicKey, privateKey } = await createKeyPair();
    const kid = crypto.randomBytes(4).toString('hex');

    this.keyPairs.push({ kid, publicKey, privateKey, ttl: Date.now() + ttl });

    return { publicKey, kid };
  }

  public getPublicKeys(): IKeyPair[] {
    // Expunge any old entries.
    this.sweep();

    // Return the public key and TTL for each valid key
    return this.keyPairs.map((k) => ({ publicKey: k.publicKey, ttl: k.ttl, kid: k.kid }));
  }
}

export { KeyStore, IKeyPair, KEYSTORE_MAX_KEY_TTL };
