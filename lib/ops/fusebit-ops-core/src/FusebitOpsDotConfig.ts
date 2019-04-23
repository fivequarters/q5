import { join } from 'path';
import { DotConfig } from '@5qtrs/dot-config';

// ------------------
// Internal Constants
// ------------------

const dotFolderName = '.fusebit-ops';
const settingsPath = 'settings.json';
const credsCachePath = join('cache', 'creds', 'aws.json');

// -------------------
// Exported Interfaces
// -------------------

export enum AwsAccountType {
  user = 'user',
  prod = 'prod',
}

export interface IAwsUser {
  userName?: string;
  secretAccessKey?: string;
  accessKeyId?: string;
}

// ----------------
// Exported Classes
// ----------------

export class FusebitOpsDotConfig extends DotConfig {
  private constructor() {
    super(dotFolderName);
  }

  public static async create() {
    return new FusebitOpsDotConfig();
  }

  public async getAwsAccount(type: AwsAccountType): Promise<string | undefined> {
    const settings: any = await this.readJson(settingsPath);
    if (settings && settings.aws && settings.aws.accounts) {
      return settings.aws.accounts[type.toString()] || undefined;
    }
    return undefined;
  }

  public async getSettingsPath(): Promise<string> {
    return join(this.path, settingsPath);
  }

  public async setAwsAccount(type: AwsAccountType, account: string) {
    let settings: any = await this.readJson(settingsPath);
    settings = settings || {};
    settings.aws = settings.aws || {};
    settings.aws.accounts = settings.aws.accounts || {};
    settings.aws.accounts[type.toString()] = account;
    await this.writeJson(settingsPath, settings);
  }

  public async getAwsRole(type: AwsAccountType, name: string): Promise<string | undefined> {
    const settings: any = await this.readJson(settingsPath);
    if (settings && settings.aws && settings.aws.roles) {
      const roles = settings.aws.roles[type.toString()] || {};
      return roles[name] || undefined;
    }
    return undefined;
  }

  public async setAwsRole(type: AwsAccountType, name: string, role: string) {
    let settings: any = await this.readJson(settingsPath);
    settings = settings || {};
    settings.aws = settings.aws || {};
    settings.aws.roles = settings.aws.roles || {};
    settings.aws.roles[type.toString()] = settings.aws.roles[type.toString()] || {};
    settings.aws.roles[type.toString()][name] = role;
    await this.writeJson(settingsPath, settings);
  }

  public async getAwsUser(): Promise<IAwsUser | undefined> {
    const settings: any = await this.readJson(settingsPath);
    if (settings && settings.aws && settings.aws) {
      return settings.aws.user || undefined;
    }
    return undefined;
  }

  public async setAwsUser(user: IAwsUser) {
    let settings: any = await this.readJson(settingsPath);
    settings = settings || {};
    settings.aws = settings.aws || {};
    settings.aws.user = settings.aws.user || {};
    settings.aws.user = user;
    await this.writeJson(settingsPath, settings);
  }

  public async getCachedCreds(key: string): Promise<string | undefined> {
    const cache: any = await this.readJson(credsCachePath);
    return cache && cache[key] ? cache[key] : undefined;
  }

  public async setCachedCreds(key: string, creds: string) {
    let cache: any = await this.readJson(credsCachePath);
    cache = cache || {};
    cache[key] = creds;
    await this.writeJson(credsCachePath, cache);
  }
}
