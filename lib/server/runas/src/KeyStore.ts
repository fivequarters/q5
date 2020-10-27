import { IFunctionParams, IFunctionPermission } from './Request';

import { signJwt, verifyJwt } from '@5qtrs/jwt';

import { createKeyPair } from '@5qtrs/key-pair';

import * as crypto from 'crypto';

const KEYSTORE_MAX_KEY_TTL = 12 * 60 * 60 * 1000; // 12 hrs
const KEYSTORE_MIN_WINDOW = 5 * 60 * 1000; // 5 minutes
const KEYSTORE_DEFAULT_ALG = 'RS256';

interface IKeyPair {
  kid: string;
  publicKey: string;
  privateKey?: string;
  ttl: number;
}

interface IKeyStoreOptions {
  maxKeyTtl?: number;
  minValidWindow?: number;
  jwtAlgorithm?: string;
}

class KeyStore {
  private keyPair: IKeyPair;

  private maxKeyTtl: number;
  private minValidWindow: number;
  private jwtAlgorithm: string;

  constructor(options: IKeyStoreOptions = {}) {
    this.keyPair = { kid: 'A', publicKey: 'A', ttl: 0 };
    this.maxKeyTtl = options.maxKeyTtl || KEYSTORE_MAX_KEY_TTL;
    this.minValidWindow = options.minValidWindow || KEYSTORE_MIN_WINDOW;
    this.jwtAlgorithm = options.jwtAlgorithm || KEYSTORE_DEFAULT_ALG;
  }

  public async signJwt(payload: any): Promise<string> {
    const key = this.keyPair;

    if (!key) {
      throw Error('unable to create jwt');
    }

    payload.aud = `${process.env.API_SERVER}`;
    payload.iss = `${process.env.API_SERVER}/issuer`;
    payload.kid = key.kid;
    payload.iat = Date.now();

    return signJwt(payload, key.privateKey as string, {
      algorithm: this.jwtAlgorithm,
      expiresIn: this.minValidWindow,
    });
  }

  public async rekey(): Promise<IKeyPair> {
    const { publicKey, privateKey } = await createKeyPair();
    const kid = crypto.randomBytes(4).toString('hex');

    const keyPair = { kid, publicKey, privateKey, ttl: Date.now() + this.maxKeyTtl };

    return keyPair;
  }

  // Separate the key pair generation from assignment to allow async operations like AWS to complete before
  // attempting to use it to mint JWTs.
  public setKeyPair(keyPair: IKeyPair) {
    this.keyPair = keyPair;
  }

  public getPublicKey(): IKeyPair {
    // Return the public key and TTL for each valid key
    return { publicKey: this.keyPair.publicKey, ttl: this.keyPair.ttl, kid: this.keyPair.kid };
  }
}

export { KeyStore, IKeyPair, KEYSTORE_MAX_KEY_TTL, KEYSTORE_MIN_WINDOW, KEYSTORE_DEFAULT_ALG };
