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

  public async getAwsAccount(type: AwsAccountType): Promise<string> {
    const settings: any = await this.readJson(settingsPath);
    let account;
    if (settings && settings.aws && settings.aws.accounts) {
      account = settings.aws.accounts[type.toString()] || undefined;
    }

    if (!account) {
      throw new Error(`The AWS '${type.toString()}' account is not configured`);
    }

    return account;
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

  public async getAwsRole(type: AwsAccountType, name: string): Promise<string> {
    const settings: any = await this.readJson(settingsPath);
    let role;
    if (settings && settings.aws && settings.aws.roles) {
      const roles = settings.aws.roles[type.toString()] || {};
      role = roles[name] || undefined;
    }

    if (!role) {
      throw new Error(`The AWS '${type.toString()}' account role '${name}' is not configured`);
    }

    return role;
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

  public async getAwsUser(): Promise<IAwsUser> {
    const settings: any = await this.readJson(settingsPath);
    let user;
    if (settings && settings.aws && settings.aws) {
      user = settings.aws.user || undefined;
    }

    if (!user) {
      throw new Error(`The AWS user is not configured`);
    }

    return user;
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
