import { join } from 'path';
import { DotConfig } from '@5qtrs/dot-config';
import { FusebitProfileError } from './FusebitProfileError';

// ------------------
// Internal Constants
// ------------------

const dotFolderName = '.fusebit';
const settingsPath = 'settings.json';
const keyPairPath = 'keys';
const publicKeyFileName = 'pub';
const privateKeyFileName = 'pri';
const credsCachePath = join('cache', 'creds');
const credsFileName = 'creds.json';

// ----------------
// Exported Classes
// ----------------

export class FusebitDotConfig extends DotConfig {
  private constructor(directory?: string) {
    super(dotFolderName, directory);
  }

  public static async create(directory?: string) {
    return new FusebitDotConfig(directory);
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

  public async publicKeyExists(name: string, kid: string): Promise<boolean> {
    let publicKey;
    try {
      publicKey = await this.getPublicKey(name, kid);
    } catch (error) {
      // do nothing
    }
    return publicKey !== undefined;
  }

  public async getPublicKey(name: string, kid: string): Promise<string> {
    const publicKeyPath = await this.getPublicKeyPath(name, kid);
    return this.readPublicKeyFile(publicKeyPath, name);
  }

  public async setPublicKey(name: string, kid: string, privateKey: string): Promise<void> {
    const publicKeyPath = await this.getPublicKeyPath(name, kid);
    this.writePublicKeyFile(publicKeyPath, privateKey, name);
  }

  public async privateKeyExists(name: string, kid: string): Promise<boolean> {
    let privateKey;
    try {
      privateKey = await this.getPrivateKey(name, kid);
    } catch (error) {
      // do nothing
    }
    return privateKey !== undefined;
  }

  public async getPrivateKey(name: string, kid: string): Promise<string> {
    const privateKeyPath = await this.getPrivateKeyPath(name, kid);
    return this.readPrivateKeyFile(privateKeyPath, name);
  }

  public async setPrivateKey(name: string, kid: string, privateKey: string): Promise<void> {
    const privateKeyPath = await this.getPrivateKeyPath(name, kid);
    this.writePrivateKeyFile(privateKeyPath, privateKey, name);
  }

  public async removeKeyPair(name: string, kid: string): Promise<void> {
    const path = await this.getKeyPairPath(name, kid);
    this.removeKeysDirectory(path, name);
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
      throw FusebitProfileError.readFileError('settings', error);
    }
  }

  private async writeSettings(settings: any): Promise<void> {
    try {
      await this.writeJson(settingsPath, settings);
    } catch (error) {
      throw FusebitProfileError.writeFileError('settings', error);
    }
  }

  private async readBinaryFile(path: string, fileName: string): Promise<string> {
    try {
      const buffer = await this.readBinary(path);
      if (!buffer || !buffer.length) {
        const message = `The file '${path}' is empty`;
        throw new Error(message);
      }
      return buffer.toString();
    } catch (error) {
      throw FusebitProfileError.readFileError(fileName, error);
    }
  }

  private async writeBinaryFile(path: string, contents: string, fileName: string): Promise<void> {
    try {
      const buffer = Buffer.from(contents);
      await this.writeBinary(path, buffer);
    } catch (error) {
      throw FusebitProfileError.writeFileError(fileName, error);
    }
  }

  private async getKeyPairPath(name: string, kid: string): Promise<string> {
    return join(keyPairPath, name, kid);
  }

  private async getPublicKeyPath(name: string, kid: string): Promise<string> {
    const path = await this.getKeyPairPath(name, kid);
    return join(path, publicKeyFileName);
  }

  private async readPublicKeyFile(path: string, name: string): Promise<string> {
    return this.readBinaryFile(path, `'${name}' public key`);
  }

  private async readPrivateKeyFile(path: string, name: string): Promise<string> {
    return this.readBinaryFile(path, `'${name}' private key`);
  }

  private async writePublicKeyFile(path: string, key: string, name: string): Promise<void> {
    return this.writeBinaryFile(path, key, `'${name}' public key`);
  }

  private async getPrivateKeyPath(name: string, kid: string): Promise<string> {
    const path = await this.getKeyPairPath(name, kid);
    return join(path, privateKeyFileName);
  }

  private async writePrivateKeyFile(path: string, key: string, name: string): Promise<void> {
    return this.writeBinaryFile(path, key, `'${name}' private key`);
  }

  private async removeKeysDirectory(path: string, name: string): Promise<void> {
    try {
      await this.removeDirectory(path);
    } catch (error) {
      throw FusebitProfileError.removeDirectoryError(`${name} keys`, error);
    }
  }

  private async getCachedCredsPath(name: string, kid: string): Promise<string> {
    return join(credsCachePath, name, kid, credsFileName);
  }

  private async removeCachedCredsDirectory(path: string, name: string): Promise<void> {
    try {
      await this.removeDirectory(path);
    } catch (error) {
      throw FusebitProfileError.removeDirectoryError(`${name} cached credentials`, error);
    }
  }
}
