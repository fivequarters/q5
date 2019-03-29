import { FlexdDotConfig } from './FlexdDotConfig';
import { createKeyPair } from '@5qtrs/key-pair';
import { signJwt } from '@5qtrs/jwt';
import { clone } from '@5qtrs/clone';
import { random } from '@5qtrs/random';
import { toBase64 } from '@5qtrs/base64';

// ------------------
// Internal Constants
// ------------------

const expireInSeconds = 60 * 60;
const minExpireInterval = 1000 * 60 * 5;

// ------------------
// Internal Functions
// ------------------

function getKeyHash(profile: IFlexdProfile) {
  return `${toBase64(profile.issuer as string)}:${toBase64(profile.subject as string)}:${toBase64(profile.baseUrl)}`;
}

function generateIssuer(baseUrl: string) {
  return `${random()}.cli.${baseUrl}`;
}

function generateSubject() {
  return `cli-installation-${random({ lengthInBytes: 4 })}`;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IFlexdProfileSettings {
  [index: string]: string | undefined;
  account?: string;
  subscription?: string;
  boundary?: string;
  function?: string;
}

export interface IFlexdNewProfile extends IFlexdProfileSettings {
  baseUrl: string;
  issuer?: string;
  subject?: string;
  account?: string;
  subscription?: string;
  boundary?: string;
  function?: string;
}

export interface IFlexdProfile extends IFlexdNewProfile {
  keyPair: string;
  kid: string;
}

export interface IFlexdExecutionProfile extends IFlexdProfileSettings {
  token: string;
  baseUrl: string;
}

// ----------------
// Exported Classes
// ----------------

export class FlexdProfile {
  private dotConfig: FlexdDotConfig;

  private constructor(dotConfig: FlexdDotConfig) {
    this.dotConfig = dotConfig;
  }

  public static async create() {
    const dotConfig = await FlexdDotConfig.create();
    return new FlexdProfile(dotConfig);
  }

  public async getProfile(name?: string): Promise<IFlexdProfile | undefined> {
    const profile: unknown = this.dotConfig.getProfile(name);
    return profile as IFlexdProfile | undefined;
  }

  public async getExecutionProfile(name?: string): Promise<IFlexdExecutionProfile> {
    const profile = await this.getProfile(name);
    if (!profile) {
      const message = `The '${name || '<default>'}' profile does not exist.`;
      throw new Error(message);
    }
    let token = await this.getCachedAccessToken(name as string, profile);
    if (!token) {
      token = await this.createAccessToken(name as string, profile);
    }
    if (!token) {
      const message = `Unable to generate an access token for the '${name || '<default>'}' profile.`;
      throw new Error(message);
    }

    return {
      token,
      baseUrl: profile.baseUrl,
      accountId: profile.accountId || undefined,
      subscriptionId: profile.subscriptionId || undefined,
      boundaryId: profile.boundaryId || undefined,
      functionId: profile.functionId || undefined,
    };
  }

  public async addProfile(name: string, newProfile: IFlexdNewProfile): Promise<IFlexdProfile> {
    const exists = await this.dotConfig.profileExists(name);
    if (exists) {
      const message = `The '${name}' profile already exists.`;
      throw new Error(message);
    }

    const { publicKey, privateKey } = await createKeyPair();
    const keyPairName = `${name}-keys`;
    const kid = await this.addKeyPair(keyPairName, publicKey, privateKey);

    const profile = clone(newProfile) as IFlexdProfile;
    profile.issuer = profile.issuer || generateIssuer(profile.baseUrl);
    profile.subject = profile.subject || generateSubject();
    profile.keyPair = keyPairName;
    profile.kid = kid;

    await this.dotConfig.setProfile(name, profile, false);

    const defaultProfile = await this.getDefaultProfile();
    if (!defaultProfile) {
      await this.setDefaultProfile(name);
    }

    return profile;
  }

  public async updateProfile(name: string, settings: IFlexdProfileSettings): Promise<IFlexdProfile> {
    const profile = await this.dotConfig.getProfile(name);
    if (settings.accountId) {
      profile.accountId = settings.accountId;
    }
    if (settings.subscriptionId) {
      profile.subscriptionId = settings.subscriptionId;
    }
    if (settings.boundaryId) {
      profile.boundaryId = settings.boundaryId;
    }
    if (settings.functionId) {
      profile.functionId = settings.functionId;
    }
    await this.dotConfig.setProfile(name, profile, true);
    return profile;
  }

  public async copyProfile(name: string, toName: string, overWrite: boolean = false) {
    return this.dotConfig.copyProfile(name, toName, overWrite);
  }

  public async renameProfile(name: string, newName: string, overWrite: boolean = false) {
    return this.dotConfig.renameProfile(name, newName, overWrite);
  }

  public async getDefaultProfile() {
    return this.dotConfig.getDefaultProfile();
  }

  public async setDefaultProfile(name: string) {
    return this.dotConfig.setDefaultProfile(name);
  }

  public async getPublicKey(name: string) {
    const profile = await this.getProfile(name);
    if (!profile) {
      const message = `There is no '${name}' profile.`;
      throw new Error(message);
    }
    return this.dotConfig.getPublicKey(name, profile.kid);
  }

  private async addKeyPair(name: string, publicKey: string, privateKey: string): Promise<string> {
    let kid;
    let added = false;
    while (!added) {
      kid = random({ lengthInBytes: 4 }) as string;
      added = await this.dotConfig.setKeyPair(name, publicKey, privateKey, kid);
    }

    return kid as string;
  }

  private async createAccessToken(name: string, profile: IFlexdProfile) {
    const privateKey = await this.dotConfig.getPrivateKey(profile.keyPair, profile.kid);
    if (privateKey) {
      const expires = new Date(Date.now() + 1000 * expireInSeconds);
      const options = {
        algorithm: 'RS256',
        expiresIn: expireInSeconds,
        audience: profile.baseUrl,
        issuer: profile.issuer,
        subject: profile.subject,
        keyid: profile.kid,
        header: {
          jwtId: random(),
        },
      };

      const token = await signJwt({}, privateKey, options);
      await this.cacheAccessToken(name, token, expires, profile);
      return token;
    }
    return undefined;
  }

  private async cacheAccessToken(name: string, token: string, expires: Date, profile: IFlexdProfile): Promise<void> {
    const hash = getKeyHash(profile);
    const entry = { token, expires: expires.toLocaleString(), hash };
    return this.dotConfig.setCachedCreds(name, profile.kid, entry);
  }

  private async getCachedAccessToken(name: string, profile: IFlexdProfile): Promise<string | undefined> {
    const entry: any = await this.dotConfig.getCachedCreds(name, profile.kid);
    if (entry) {
      const { token, expires, hash } = entry;
      if (hash === getKeyHash(profile)) {
        const expireInMs = new Date(expires).valueOf();
        const cutoffInMs = Date.now() - minExpireInterval;
        if (expireInMs > cutoffInMs) {
          return token;
        }
      }
    }

    return undefined;
  }
}
