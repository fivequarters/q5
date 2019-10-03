import { fromBase64, toBase64 } from '@5qtrs/base64';
import { clone } from '@5qtrs/clone';
import { avoidRace } from '@5qtrs/promise';
import { STS } from 'aws-sdk';
import { InMemoryCredsCache } from './InMemoryCredsCache';

// ---------
// Test Hook
// ---------

let mockForSts: STS;
export function mockSts(mock: any) {
  mockForSts = mock as STS;
}

// ------------------
// Internal Constants
// ------------------

const minExpiredWindow = 10 * 60 * 1000;

// ------------------
// Internal Functions
// ------------------

function createSTS(options: any): STS {
  return mockForSts || new STS(options);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  expires?: number;
}

export interface IAwsCredsCache {
  set: (key: string, value: string) => Promise<void>;
  get: (key: string) => Promise<string | undefined>;
}

export type IMfaCodeResolver = (accountId: string) => Promise<{ code: string }>;

export interface IAwsCredsOptions {
  account: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  useMfa?: boolean;
  mfaSerialNumber?: string;
  userName?: string;
  mfaCodeResolver?: IMfaCodeResolver;
}

// ----------------
// Exported Classes
// ----------------

export class AwsCreds {
  public static async create(options: IAwsCredsOptions, cache?: IAwsCredsCache) {
    cache = cache || new InMemoryCredsCache();
    if (options.useMfa && !options.mfaCodeResolver) {
      throw new Error("If using MFA, the 'mfaCodeResolver' must be provided.");
    }

    return new AwsCreds(options, cache);
  }

  private cache: IAwsCredsCache;
  private options: IAwsCredsOptions;
  private parentCreds?: AwsCreds;
  private roleAccount?: string;
  private roleName?: string;
  private rolePath?: string;
  private assumeRoleRaceFree: () => Promise<IAwsCredentials>;

  private constructor(options: IAwsCredsOptions, cache: IAwsCredsCache) {
    this.options = clone(options);
    this.cache = cache;
    this.assumeRoleRaceFree = avoidRace(() => this.assumeRole());
  }

  public asRole(account: string, role: string) {
    const credsForRole = new AwsCreds(this.options, this.cache);
    credsForRole.parentCreds = this;
    credsForRole.roleAccount = account;
    credsForRole.roleName = role;
    credsForRole.rolePath = this.rolePath ? `${this.rolePath}.${role}` : role;
    return credsForRole;
  }

  public async getCredentials(): Promise<IAwsCredentials> {
    const baseCreds = this.options;
    const parentCreds = this.parentCreds;
    let creds: IAwsCredentials = {};
    if (!parentCreds) {
      if (baseCreds.accessKeyId && baseCreds.secretAccessKey) {
        creds.accessKeyId = baseCreds.accessKeyId;
        creds.secretAccessKey = baseCreds.secretAccessKey;
        if (baseCreds.sessionToken) {
          creds.sessionToken = baseCreds.sessionToken;
        }
      }
    } else {
      const cachedCreds = await this.getCachedCredentials();
      if (cachedCreds) {
        creds = cachedCreds;
      } else {
        creds = await this.assumeRoleRaceFree();
        await this.setCachedCredentials(creds);
      }
    }
    return creds;
  }

  private getCacheKey() {
    return `${this.roleAccount}.${this.rolePath}`;
  }

  private async setCachedCredentials(creds: IAwsCredentials): Promise<void> {
    if (this.rolePath && creds.expires && creds.expires > Date.now() + minExpiredWindow) {
      const toCache = toBase64(JSON.stringify(creds));
      const key = this.getCacheKey();
      await this.cache.set(key, toCache);
    }
  }

  private async getCachedCredentials(): Promise<IAwsCredentials | undefined> {
    let creds: IAwsCredentials | undefined;
    if (this.rolePath) {
      const key = this.getCacheKey();
      const credsString = await this.cache.get(key);
      if (credsString) {
        let cached: any;
        try {
          cached = JSON.parse(fromBase64(credsString));
        } catch (error) {
          // do nothing;
        }

        if (cached && cached.expires && cached.expires > Date.now() + minExpiredWindow) {
          creds = cached;
        }
      }
    }

    return creds;
  }

  private async assumeRole(): Promise<IAwsCredentials> {
    const stsOptions: any = {};

    if (this.parentCreds) {
      const creds = await this.parentCreds.getCredentials();
      if (creds) {
        stsOptions.accessKeyId = creds.accessKeyId;
        stsOptions.secretAccessKey = creds.secretAccessKey;
        if (creds.sessionToken) {
          stsOptions.sessionToken = creds.sessionToken;
        }
      }
    } else if (this.options.secretAccessKey && this.options.accessKeyId) {
      stsOptions.accessKeyId = this.options.accessKeyId;
      stsOptions.secretAccessKey = this.options.secretAccessKey;
    }

    const sts = createSTS(stsOptions);

    const params: any = {
      RoleArn: `arn:aws:iam::${this.roleAccount}:role/${this.roleName}`,
      RoleSessionName: `assumed-role-${this.rolePath}-${this.roleAccount}`,
    };
    if (this.options.useMfa && this.options.mfaCodeResolver) {
      const serialNumber =
        this.options.mfaSerialNumber || `arn:aws:iam::${this.options.account}:mfa/${this.options.userName}`;
      const resolved = await this.options.mfaCodeResolver(this.roleAccount || '<unknown>');
      params.SerialNumber = serialNumber;
      params.TokenCode = resolved.code;
    }

    return new Promise((resolve, reject) => {
      sts.assumeRole(params, (error, result) => {
        if (error) {
          const message = [
            `Failed to assume role '${this.roleName}' in account '${this.roleAccount}'`,
            `due to the following error: '${error.message}'`,
          ].join(' ');
          return reject(new Error(message));
        }

        const credentials = result.Credentials;
        let assumedRoleCreds: IAwsCredentials = {};
        if (credentials) {
          assumedRoleCreds = {
            accessKeyId: credentials.AccessKeyId,
            secretAccessKey: credentials.SecretAccessKey,
            sessionToken: credentials.SessionToken,
            expires: credentials.Expiration.valueOf(),
          };
        }
        resolve(assumedRoleCreds);
      });
    });
  }
}
