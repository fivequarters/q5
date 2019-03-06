import { AwsDeployment } from '@5qtrs/aws-deployment';
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
  get: (key: string) => Promise<string>;
}

export interface IAwsCredsOptions {
  accessKeyId?: string;
  secretAccessKey?: string;
  useMfa?: boolean;
  mfaSerialNumber?: string;
  userName?: string;
  mfaCodeResolver?: (mfaSerialNumber: string) => Promise<{ code: string }>;
}

// ----------------
// Exported Classes
// ----------------

export class AwsCreds {
  public static async create(deployment: AwsDeployment, baseCreds?: IAwsCredsOptions, cache?: IAwsCredsCache) {
    cache = cache || new InMemoryCredsCache();
    baseCreds = baseCreds || {};

    if (baseCreds.useMfa && !baseCreds.mfaCodeResolver) {
      throw new Error("If using MFA, the 'mfaCodeResolver' must be provided.");
    }

    return new AwsCreds(deployment, baseCreds, cache);
  }

  private deployment: AwsDeployment;
  private cache: IAwsCredsCache;
  private baseCreds: IAwsCredsOptions;
  private parentCreds?: AwsCreds;
  private roleAccount?: string;
  private roleName?: string;
  private rolePath?: string;

  private constructor(deployment: AwsDeployment, baseCreds: IAwsCredsOptions, cache: IAwsCredsCache) {
    this.deployment = deployment;
    this.baseCreds = baseCreds;
    this.cache = cache;
  }

  public asRole({ account, name }: { account: string; name: string }) {
    const credsForRole = new AwsCreds(this.deployment, this.baseCreds, this.cache);
    credsForRole.parentCreds = this;
    credsForRole.roleAccount = account;
    credsForRole.roleName = name;
    credsForRole.rolePath = this.rolePath ? `${this.rolePath}.${name}` : name;
    return credsForRole;
  }

  public async getCredentials(): Promise<IAwsCredentials> {
    const baseCreds = this.baseCreds;
    const parentCreds = this.parentCreds;
    let creds: IAwsCredentials = {};
    if (!parentCreds) {
      if (baseCreds.accessKeyId && baseCreds.secretAccessKey) {
        creds.accessKeyId = baseCreds.accessKeyId;
        creds.secretAccessKey = baseCreds.secretAccessKey;
      }
    } else {
      const cachedCreds = await this.getCachedCredentials();
      if (cachedCreds) {
        creds = cachedCreds;
      } else {
        creds = await this.assumeRole();
        await this.setCachedCredentials(creds);
      }
    }
    return creds;
  }

  private async setCachedCredentials(creds: IAwsCredentials): Promise<void> {
    if (this.rolePath && creds.expires && creds.expires > Date.now() + minExpiredWindow) {
      const toCache = JSON.stringify(creds);
      await this.cache.set(this.rolePath, toCache);
    }
  }

  private async getCachedCredentials(): Promise<IAwsCredentials | undefined> {
    let creds: IAwsCredentials | undefined;
    if (this.rolePath) {
      const credsString = await this.cache.get(this.rolePath);
      if (credsString) {
        let cached: any;
        try {
          cached = JSON.parse(credsString);
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
    const stsOptions: any = {
      region: this.deployment.region.code,
    };

    if (this.parentCreds) {
      const creds = await this.parentCreds.getCredentials();
      if (creds) {
        stsOptions.accessKeyId = creds.accessKeyId;
        stsOptions.secretAccessKey = creds.secretAccessKey;
        if (creds.sessionToken) {
          stsOptions.sessionToken = creds.sessionToken;
        }
      }
    } else if (this.baseCreds.secretAccessKey && this.baseCreds.accessKeyId) {
      stsOptions.accessKeyId = this.baseCreds.accessKeyId;
      stsOptions.secretAccessKey = this.baseCreds.secretAccessKey;
    }

    const sts = createSTS(stsOptions);

    const assumeRoleOptions: any = {
      RoleArn: `arn:aws:iam::${this.roleAccount}:role/${this.roleName}`,
      RoleSessionName: `assumed-role-${this.rolePath}`,
    };
    if (this.baseCreds.useMfa && this.baseCreds.mfaCodeResolver) {
      const serialNumber =
        this.baseCreds.mfaSerialNumber || `arn:aws:iam::${this.deployment.account}:mfa/${this.baseCreds.userName}`;
      const resolved = await this.baseCreds.mfaCodeResolver(serialNumber);
      assumeRoleOptions.SerialNumber = serialNumber;
      assumeRoleOptions.TokenCode = resolved.code;
    }

    return new Promise((resolve, reject) => {
      sts.assumeRole(assumeRoleOptions, (error, result) => {
        if (error) {
          const message = [
            `Failed to assume role '${this.roleName}' in account '${this.roleAccount}`,
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
