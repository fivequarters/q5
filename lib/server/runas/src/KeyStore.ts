import crypto from 'crypto';

import * as Constants from '@5qtrs/constants';

import { signJwt } from '@5qtrs/jwt';
import { createKeyPair } from '@5qtrs/key-pair';

import { IFunctionParams, IFunctionPermission } from './Request';

const KEYSTORE_MAX_KEY_TTL = 12 * 60 * 60 * 1000; // 12 hrs
const KEYSTORE_JWT_VALIDITY = 15 * 60 * 1000; // 15 minutes, to cover cron invocations
const KEYSTORE_REKEY_BEFORE = 10 * KEYSTORE_JWT_VALIDITY; // Rekey when the life of the key closer than this.

const KEYSTORE_DEFAULT_ALG = 'RS256';

interface IKeyPair {
  kid: string;
  publicKey: string;
  privateKey?: string;
  ttl: number;
}

interface IKeyStoreOptions {
  maxKeyTtl?: number;
  jwtValidDuration?: number;
  jwtAlgorithm?: string;
  rekeyInterval?: number;
  audience?: string;
}

class KeyStore {
  private keyPair: IKeyPair;

  private maxKeyTtl: number;
  private jwtValidDuration: number;
  private rekeyInterval: number;
  private jwtAlgorithm: string;
  private keyRefreshTimer: ReturnType<typeof setTimeout> | undefined;
  private audience: string;

  constructor(options: IKeyStoreOptions = {}) {
    this.keyPair = { kid: 'A', publicKey: 'A', ttl: 0 };
    this.maxKeyTtl = options.maxKeyTtl || KEYSTORE_MAX_KEY_TTL;
    this.jwtValidDuration = options.jwtValidDuration || KEYSTORE_JWT_VALIDITY;
    this.rekeyInterval = options.rekeyInterval || KEYSTORE_REKEY_BEFORE;
    this.jwtAlgorithm = options.jwtAlgorithm || KEYSTORE_DEFAULT_ALG;
    this.audience = options.audience || (process.env.API_SERVER as string);
  }

  public async signJwt(payload: any): Promise<string> {
    const key = this.keyPair;

    if (!key || key.ttl < Date.now()) {
      throw new Error('unable to create jwt');
    }

    const header = { kid: key.kid };
    payload.aud = this.audience;
    payload.iss = Constants.makeSystemIssuerId(key.kid);
    payload.iat = Math.floor(Date.now() / 1000);

    return signJwt(payload, key.privateKey as string, {
      algorithm: this.jwtAlgorithm,
      expiresIn: Math.floor(this.jwtValidDuration / 1000),
      header,
    });
  }

  public async createKey(): Promise<IKeyPair> {
    const { publicKey, privateKey } = await createKeyPair();
    const kid = crypto.randomBytes(Constants.RUNAS_KID_LEN).toString('hex');

    const keyPair = { kid, publicKey, privateKey, ttl: Date.now() + this.maxKeyTtl };

    return keyPair;
  }

  public async rekey(): Promise<IKeyPair> {
    const keyPair = await this.createKey();
    this.setKeyPair(keyPair);

    return keyPair;
  }

  // Separate the key pair generation from assignment to allow async operations like AWS to complete writing
  // to DynamoDB before attempting to use it to mint JWTs.
  //
  // Additionaly, restart the timer for a rekey based on this key being created.
  public setKeyPair(keyPair: IKeyPair) {
    this.keyPair = keyPair;

    if (this.keyRefreshTimer) {
      clearTimeout(this.keyRefreshTimer);
    }
    this.keyRefreshTimer = setTimeout(() => this.rekey(), this.rekeyInterval);
  }

  public getPublicKey(): IKeyPair {
    // Return the public key and TTL for each valid key
    return { publicKey: this.keyPair.publicKey, ttl: this.keyPair.ttl, kid: this.keyPair.kid };
  }

  public async healthCheck() {
    const key = this.keyPair;

    if (!key || key.ttl < Date.now()) {
      throw new Error('invalid keypair');
    }
  }

  public shutdown() {
    if (this.keyRefreshTimer) {
      clearTimeout(this.keyRefreshTimer);
      this.keyRefreshTimer = undefined;
    }
  }
}

export { KeyStore, IKeyPair, KEYSTORE_MAX_KEY_TTL, KEYSTORE_JWT_VALIDITY, KEYSTORE_DEFAULT_ALG };
