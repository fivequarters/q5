import { toBase64 } from '@5qtrs/base64';
import { signJwt } from '@5qtrs/jwt';
import { createKeyPair } from '@5qtrs/key-pair';
import { random } from '@5qtrs/random';
import { FusebitDotConfig } from './FusebitDotConfig';
import { FusebitProfileException } from './FusebitProfileException';

import * as Constants from '@5qtrs/constants';

// ------------------
// Internal Constants
// ------------------

const expireInMilliseconds = 60 * 60 * 2 * 1000;
const minExpireInterval = 1000 * 60 * 5;
const kidLength = 8;
const jwtAlgorithm = 'RS256';

interface IPermission {
  action: string;
  resource: string;
}

interface IPermissions {
  allow: IPermission[];
}

// ------------------
// Internal Functions
// ------------------

function getKeyHash(profile: IFusebitProfile): string {
  return `${toBase64(profile.issuer as string)}:${toBase64((profile.clientId || profile.subject) as string)}:${toBase64(
    profile.baseUrl
  )}`;
}

function nomarlizeBaseUrl(baseUrl: string): string {
  baseUrl = baseUrl.toLowerCase();
  if (baseUrl[baseUrl.length - 1] === '/') {
    baseUrl = baseUrl.substring(0, baseUrl.length - 1);
  }
  if (baseUrl.indexOf('http') === -1) {
    throw FusebitProfileException.baseUrlMissingProtocol(baseUrl);
  }
  return baseUrl;
}

function getDomainFromBaseUrl(baseUrl: string): string {
  let domain = baseUrl.toLowerCase();
  domain = domain.replace('https://', '').replace('http://', '');
  const indexOfPort = domain.indexOf(':');
  if (indexOfPort !== -1) {
    domain = domain.substring(0, indexOfPort);
  }

  const indexOfForwardSlash = domain.indexOf('/');
  if (indexOfForwardSlash !== -1) {
    domain = domain.substring(0, indexOfForwardSlash);
  }

  return domain;
}

function getProfileNameFromBaseUrl(baseUrl: string) {
  const domain = getDomainFromBaseUrl(baseUrl);
  return domain.split('.')[0];
}

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitProfileSettings {
  [index: string]: string | boolean | undefined;
  synthetic?: boolean;
  account: string;
  subscription?: string;
  boundary?: string;
  function?: string;
}

export interface IFusebitProfile extends IFusebitProfileSettings {
  name: string;
  baseUrl: string;
  issuer: string;
  created: string;
  updated: string;
  clientId?: string;
  tokenUrl?: string;
  keyPair?: string;
  kid?: string;
}

export interface IPKIFusebitProfile extends IFusebitProfile {
  keyPair: string;
  kid: string;
}

export interface IOAuthFusebitProfile extends IFusebitProfile {
  tokenUrl: string;
  clientId: string;
}

export interface IFusebitNewProfile extends IFusebitProfileSettings {
  agent: string;
  baseUrl: string;
  issuer: string;
  subject: string;
}

export interface IFusebitKeyPair {
  publicKey: string;
  privateKey: string;
  kid: string;
  name: string;
}

export interface IFusebitExecutionProfile extends IFusebitProfileSettings {
  accessToken: string;
  baseUrl: string;
}

// ----------------
// Exported Classes
// ----------------

export class FusebitProfile {
  public static defaultProfileId = 'api-us';
  public static defaultEveryAuthProfileId = 'everyauth-us';

  public static defaultProfiles: { [key: string]: any } = {
    'stage-api-us': {
      synthetic: true,
      account: '',
      baseUrl: 'https://stage.us-west-2.fusebit.io',
      issuer: 'https://auth.fusebit.io/oauth/device/code',
      clientId: 'dimuls6VLYgXpD7UYCo6yPdKAXPXjQng',
      tokenUrl: 'https://auth.fusebit.io/oauth/token',
    },
    'api-us': {
      synthetic: true,
      account: '',
      baseUrl: 'https://api.us-west-1.on.fusebit.io',
      issuer: 'https://auth.fusebit.io/oauth/device/code',
      clientId: 'NIfqE4hpPOXuIhllkxndlafSKcKesEfc',
      tokenUrl: 'https://auth.fusebit.io/oauth/token',
    },
    'everyauth-us': {
      provisionUrl:
        'https://api.us-west-1.on.fusebit.io/v1/run/sub-5da267cb8f284af4/system/fusebit-provision/account?include=init-pki&provision=default-connectors',
    },
  };

  public static async create() {
    const dotConfig = await FusebitDotConfig.create();
    return new FusebitProfile(dotConfig);
  }
  private dotConfig: FusebitDotConfig;

  private constructor(dotConfig: FusebitDotConfig) {
    this.dotConfig = dotConfig;
  }

  public async profileExists(name: string): Promise<boolean> {
    return this.dotConfig.profileExists(name);
  }

  public async getProfileNameFromBaseUrl(baseUrl: string): Promise<string> {
    return getProfileNameFromBaseUrl(baseUrl);
  }

  public async getDefaultProfileName(): Promise<string | undefined> {
    return this.dotConfig.getDefaultProfileName();
  }

  public async setDefaultProfileName(name: string): Promise<void> {
    await this.getProfileOrThrow(name);
    return this.dotConfig.setDefaultProfileName(name);
  }

  public async listProfiles(): Promise<IFusebitProfile[]> {
    const names = await this.dotConfig.listProfileNames();
    const profiles: IFusebitProfile[] = [];
    for (const name of names) {
      const profile = await this.getProfile(name);
      if (profile) {
        profile.name = name;
        profiles.push(profile);
      }
    }
    return profiles;
  }

  public async getProfile(name: string): Promise<IFusebitProfile | undefined> {
    const profile = (await this.dotConfig.getProfile(name)) as IFusebitProfile;
    if (profile) {
      profile.name = name;
    }
    return profile || undefined;
  }

  public async getProfileOrThrow(name: string): Promise<IFusebitProfile> {
    const profile = await this.getProfile(name);
    if (profile === undefined) {
      throw FusebitProfileException.profileDoesNotExist(name);
    }
    return profile;
  }

  public async getProfileOrDefault(name?: string): Promise<IFusebitProfile | undefined> {
    if (!name) {
      name = await this.dotConfig.getDefaultProfileName();
      if (!name) {
        return undefined;
      }
    }
    return this.getProfile(name);
  }

  public getTypedProfile(
    profile: IFusebitProfile
  ): { pkiProfile?: IPKIFusebitProfile; oauthProfile?: IOAuthFusebitProfile } {
    if (profile.clientId) {
      return { oauthProfile: profile as IOAuthFusebitProfile };
    } else {
      return { pkiProfile: profile as IPKIFusebitProfile };
    }
  }

  public async getProfileOrDefaultOrThrow(name?: string): Promise<IFusebitProfile> {
    if (!name) {
      name = await this.dotConfig.getDefaultProfileName();
      if (!name) {
        throw FusebitProfileException.noDefaultProfile();
      }
    }

    return this.getProfileOrThrow(name);
  }

  public async generateKeyPair(name: string): Promise<IFusebitKeyPair> {
    const { publicKey, privateKey } = await createKeyPair();
    const kid = await this.generateKid(name);
    return { publicKey, privateKey, kid, name };
  }

  public async addPKIProfile(
    name: string,
    toAdd: IFusebitNewProfile,
    keyPair: IFusebitKeyPair
  ): Promise<IPKIFusebitProfile> {
    await this.dotConfig.setPrivateKey(name, keyPair.kid, keyPair.privateKey);
    await this.dotConfig.setPublicKey(name, keyPair.kid, keyPair.publicKey);

    const created = new Date().toLocaleString();

    const fullProfileToAdd = {
      created,
      updated: created,
      agent: toAdd.agent,
      account: toAdd.account || undefined,
      subscription: toAdd.subscription || undefined,
      boundary: toAdd.boundary || undefined,
      function: toAdd.function || undefined,
      baseUrl: nomarlizeBaseUrl(toAdd.baseUrl),
      issuer: toAdd.issuer,
      subject: toAdd.subject,
      keyPair: keyPair.name,
      kid: keyPair.kid,
    };

    const profile = await this.dotConfig.setProfile(name, fullProfileToAdd);
    profile.name = name;

    const defaultProfileName = await this.getDefaultProfileName();
    if (!defaultProfileName) {
      await this.setDefaultProfileName(name);
    }

    return profile;
  }

  public async createProfile(name: string, toAdd: IFusebitProfileSettings): Promise<IOAuthFusebitProfile> {
    const created = new Date().toLocaleString();

    const fullProfileToAdd = {
      created,
      updated: created,
      account: toAdd.account || undefined,
      subscription: toAdd.subscription || undefined,
      boundary: toAdd.boundary || undefined,
      function: toAdd.function || undefined,
      baseUrl: nomarlizeBaseUrl(<string>toAdd.baseUrl),
      issuer: toAdd.issuer,
      clientId: toAdd.clientId,
      tokenUrl: toAdd.tokenUrl,
    };

    const profile = await this.dotConfig.setProfile(name, fullProfileToAdd);
    profile.name = name;

    const defaultProfileName = await this.getDefaultProfileName();
    if (!defaultProfileName) {
      await this.setDefaultProfileName(name);
    }

    return profile;
  }

  public async createDefaultProfile(name: string, defaultProfileId: string): Promise<IOAuthFusebitProfile> {
    if (!FusebitProfile.defaultProfiles[defaultProfileId]) {
      throw new Error(
        `Unsupported built-in profile name '${defaultProfileId}'. Supported built-in profile names are: ${Object.keys(
          FusebitProfile.defaultProfiles
        ).join(', ')}.`
      );
    }
    const created = new Date().toLocaleString();
    const effectiveName = name || (await this.getDefaultProfileName()) || defaultProfileId;

    const fullProfileToAdd = {
      name: effectiveName,
      created,
      updated: created,
      ...FusebitProfile.defaultProfiles[defaultProfileId],
    };

    const profile = await this.dotConfig.setProfile(effectiveName, fullProfileToAdd);

    const defaultProfileName = await this.getDefaultProfileName();
    if (!defaultProfileName) {
      await this.setDefaultProfileName(effectiveName);
    }

    return profile;
  }

  public async updateProfile(name: string, settings: IFusebitProfileSettings): Promise<IFusebitProfile> {
    const profile = await this.getProfileOrThrow(name);

    profile.account = settings.account;
    profile.subscription = settings.subscription;
    profile.boundary = settings.boundary;
    profile.function = settings.function;
    profile.updated = new Date().toLocaleString();

    await this.dotConfig.setProfile(name, profile);
    profile.name = name;

    return profile;
  }

  public async copyProfile(name: string, copyTo: string, overWrite: boolean): Promise<IFusebitProfile> {
    const profile = await this.getProfileOrThrow(name);
    const copyToExists = await this.profileExists(copyTo);

    if (copyToExists && !overWrite) {
      throw FusebitProfileException.profileAlreadyExists(copyTo);
    }

    profile.created = new Date().toLocaleString();
    profile.updated = profile.created;

    await this.dotConfig.setProfile(copyTo, profile);
    profile.name = copyTo;

    return profile;
  }

  public async importProfile(
    source: { profile: IFusebitProfile; pki: IFusebitKeyPair; type: string },
    target: string
  ): Promise<IFusebitProfile> {
    source.profile.name = target;
    source.pki.name = target;
    source.profile.keyPair = target;

    await this.dotConfig.setProfile(target, source.profile);
    await this.dotConfig.setPublicKey(source.profile.name, source.profile.kid!, source.pki.publicKey);
    await this.dotConfig.setPrivateKey(source.profile.name, source.profile.kid!, source.pki.privateKey);

    return source.profile;
  }

  public async renameProfile(name: string, renameTo: string, overWrite: boolean): Promise<IFusebitProfile> {
    const profile = await this.getProfileOrThrow(name);
    const renameToExists = await this.profileExists(renameTo);

    if (renameToExists && !overWrite) {
      throw FusebitProfileException.profileAlreadyExists(renameTo);
    }

    profile.updated = new Date().toLocaleString();

    await this.dotConfig.setProfile(renameTo, profile);
    await this.dotConfig.removeProfile(name);
    profile.name = renameTo;

    return profile;
  }

  public async removeProfile(name: string): Promise<void> {
    const profile = await this.getProfileOrThrow(name);
    await this.dotConfig.removeProfile(name);

    if (profile.kid) {
      const kid = profile.kid;
      if (!(await this.isKeyUsedByAnyProfiles(name, kid))) {
        await Promise.all([this.dotConfig.removeKeyPair(name, kid), this.dotConfig.removeCachedCreds(name, kid)]);
      }
    } else {
      await this.dotConfig.removeCachedCreds(name);
    }
  }

  public async getPublicKey(name: string): Promise<string> {
    const profile = await this.getProfileOrThrow(name);
    if (profile.keyPair && profile.kid) {
      return this.dotConfig.getPublicKey(profile.keyPair, profile.kid);
    } else {
      throw FusebitProfileException.notPKIProfile(name);
    }
  }

  public async getPKIAccessToken(
    name?: string,
    ignoreCache: boolean = false,
    permissions?: IPermissions,
    expiresIn?: number
  ): Promise<string> {
    const profile = await this.getProfileOrDefaultOrThrow(name);
    if (!profile.kid || !profile.keyPair) {
      throw FusebitProfileException.notPKIProfile(name || '<default>');
    }
    const pkiProfile = profile as IPKIFusebitProfile;
    if (ignoreCache || expiresIn) {
      return this.generateAccessToken(profile, pkiProfile, permissions, expiresIn);
    }

    const accessToken = !permissions ? await this.getCachedAccessToken(profile) : undefined;
    return accessToken !== undefined
      ? accessToken
      : this.generateAccessToken(profile, pkiProfile, permissions, expiresIn);
  }

  public async getPKICredentials(profile: IPKIFusebitProfile): Promise<any> {
    const result = {
      type: 'pki',
      algorithm: jwtAlgorithm,
      audience: process.env.FUSEBIT_AUDIENCE || profile.baseUrl, // Provide an override for local test targets.
      issuer: profile.issuer,
      subject: profile.subject,
      kid: profile.kid,
      privateKey: await this.dotConfig.getPrivateKey(profile.keyPair, profile.kid),
      publicKey: await this.dotConfig.getPublicKey(profile.keyPair, profile.kid),
    };

    return result;
  }

  public async getPKIExecutionProfile(
    name?: string,
    ignoreCache: boolean = false,
    permissions?: IPermissions,
    expiresIn?: number
  ): Promise<IFusebitExecutionProfile> {
    const profile = await this.getProfileOrDefaultOrThrow(name);
    const accessToken = await this.getPKIAccessToken(name, ignoreCache, permissions, expiresIn);
    return {
      accessToken,
      baseUrl: profile.baseUrl,
      account: process.env.FUSEBIT_ACCOUNT_ID || profile.account,
      subscription: profile.subscription || undefined,
      boundary: profile.boundary || undefined,
      function: profile.function || undefined,
    };
  }

  private async isKeyUsedByAnyProfiles(name: string, kid: string): Promise<boolean> {
    const profiles = await this.getProfilesUsingKey(name, kid);
    return profiles.length > 0;
  }

  private async getProfilesUsingKey(name: string, kid: string): Promise<IPKIFusebitProfile[]> {
    const profiles = await this.listProfiles();
    return <IPKIFusebitProfile[]>profiles.filter((profile) => profile.keyPair === name && profile.kid === kid);
  }

  private async generateKid(name: string) {
    let kid;
    do {
      kid = random({ lengthInBytes: kidLength / 2 }) as string;
    } while (await this.dotConfig.publicKeyExists(name, kid));
    return kid;
  }

  private async generateAccessToken(
    profile: IFusebitProfile,
    pkiProfile: IPKIFusebitProfile,
    permissions?: IPermissions,
    expiresIn: number = expireInMilliseconds
  ): Promise<string> {
    const privateKey = await this.dotConfig.getPrivateKey(pkiProfile.keyPair, pkiProfile.kid);

    const expires = new Date(Date.now() + expiresIn);

    const options = {
      algorithm: jwtAlgorithm,
      expiresIn: expiresIn / 1000,
      audience: process.env.FUSEBIT_AUDIENCE || pkiProfile.baseUrl, // Provide an override for local test targets.
      issuer: pkiProfile.issuer,
      subject: pkiProfile.subject,
      keyid: pkiProfile.kid,
      header: {
        jwtId: random(),
      },
    };

    const accessToken = await signJwt(
      {
        [Constants.JWT_PERMISSION_CLAIM]: permissions,
        [Constants.JWT_PROFILE_CLAIM]: {
          accountId: profile.account,
          subscriptionId: profile.subscription,
        },
      },
      privateKey,
      options
    );
    if (!permissions) {
      await this.setCachedAccessToken(pkiProfile, accessToken, expires);
    }

    return accessToken;
  }

  public async setCachedAccessToken(
    profile: IFusebitProfile,
    accessToken: string,
    expires: Date,
    refreshToken?: string
  ) {
    const cachedCredsEntry: any = { accessToken, hash: getKeyHash(profile), expires: expires.toLocaleString() };
    if (refreshToken) {
      cachedCredsEntry.refreshToken = refreshToken;
    }
    await this.dotConfig.setCachedCreds(profile.name, profile.kid, cachedCredsEntry);
  }

  public async getCachedRefreshToken(profile: IFusebitProfile): Promise<string | undefined> {
    const cachedCredsEntry = await this.dotConfig.getCachedCreds(profile.name, profile.kid);
    if (cachedCredsEntry) {
      if (cachedCredsEntry.hash === getKeyHash(profile)) {
        return cachedCredsEntry.refreshToken || undefined;
      }
    }

    return undefined;
  }

  public async getCachedAccessToken(profile: IFusebitProfile): Promise<string | undefined> {
    const cachedCredsEntry = await this.dotConfig.getCachedCreds(profile.name, profile.kid);
    if (cachedCredsEntry) {
      if (cachedCredsEntry.hash === getKeyHash(profile)) {
        const expires = new Date(cachedCredsEntry.expires).valueOf();
        const cutOff = Date.now() + minExpireInterval;
        if (expires > cutOff) {
          return cachedCredsEntry.accessToken;
        }
      }
    }

    return undefined;
  }
}
