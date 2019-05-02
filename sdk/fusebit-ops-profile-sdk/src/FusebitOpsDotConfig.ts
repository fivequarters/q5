import { DotConfig } from '@5qtrs/dot-config';
import { join } from 'path';
import { FusebitOpsProfileException } from './FusebitOpsProfileException';

// ------------------
// Internal Constants
// ------------------

const dotFolderName = '.fusebit-ops';
const settingsPath = 'settings.json';
const credsCachePath = join('cache', 'creds');
const credsFileName = 'creds.json';

// ----------------
// Exported Classes
// ----------------

export class FusebitOpsDotConfig extends DotConfig {

  public static async create(directory?: string) {
    return new FusebitOpsDotConfig(directory);
  }
  private constructor(directory?: string) {
    super(dotFolderName, directory);
  }

  public async getSettingsPath(): Promise<string> {
    return join(this.path, settingsPath);
  }

  public async listProfileNames(): Promise<string[]> {
    const settings = await this.readSettings();
    return Object.keys(settings.profiles);
  }

  public async defaultProfileNameExists(): Promise<boolean> {
    const profileName = await this.getDefaultProfileName();
    return profileName !== undefined;
  }

  public async getDefaultProfileName(): Promise<string | undefined> {
    const settings = await this.readSettings();
    return settings.defaults.profile || undefined;
  }

  public async setDefaultProfileName(name: string): Promise<void> {
    const settings = await this.readSettings();
    settings.defaults.profile = name;
    await this.writeSettings(settings);
  }

  public async profileExists(name: string): Promise<boolean> {
    const profile = await this.getProfile(name);
    return profile !== undefined;
  }

  public async getProfile(name: string): Promise<any> {
    const settings = await this.readSettings();
    return settings.profiles[name] || undefined;
  }

  public async setProfile(name: string, profile: any): Promise<any> {
    const settings = await this.readSettings();
    settings.profiles[name] = profile;
    await this.writeSettings(settings);
    return profile;
  }

  public async removeProfile(name: string): Promise<void> {
    const settings = await this.readSettings();
    settings.profiles[name] = undefined;
    await this.writeSettings(settings);
  }

  public async cachedCredsExist(name: string, kid: string): Promise<boolean> {
    const creds = await this.getCachedCreds(name, kid);
    return creds !== undefined;
  }

  public async getCachedCreds(name: string, kid: string): Promise<any> {
    const path = await this.getCachedCredsPath(name, kid);
    return this.readJson(path);
  }

  public async setCachedCreds(name: string, kid: string, creds: any) {
    const path = await this.getCachedCredsPath(name, kid);
    this.writeJson(path, creds);
  }

  public async removeCachedCreds(name: string, kid: string): Promise<void> {
    const path = await join(credsCachePath, name, kid);
    this.removeCachedCredsDirectory(path, name);
  }

  private async readSettings(): Promise<any> {
    try {
      let settings: any = await this.readJson(settingsPath);
      settings = settings || {};
      settings.profiles = settings.profiles || {};
      settings.defaults = settings.defaults || {};
      return settings;
    } catch (error) {
      throw FusebitOpsProfileException.readFileError('settings', error);
    }
  }

  private async writeSettings(settings: any): Promise<void> {
    try {
      await this.writeJson(settingsPath, settings);
    } catch (error) {
      throw FusebitOpsProfileException.writeFileError('settings', error);
    }
  }

  private async getCachedCredsPath(name: string, kid: string): Promise<string> {
    return join(credsCachePath, name, kid, credsFileName);
  }

  private async removeCachedCredsDirectory(path: string, name: string): Promise<void> {
    try {
      await this.removeDirectory(path);
    } catch (error) {
      throw FusebitOpsProfileException.removeDirectoryError(`${name} cached credentials`, error);
    }
  }
}
