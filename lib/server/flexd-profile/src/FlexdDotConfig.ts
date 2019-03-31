import { join } from 'path';
import { DotConfig } from '@5qtrs/dot-config';
import { clone } from '@5qtrs/clone';

// ------------------
// Internal Constants
// ------------------

const dotFolderName = 'flexd';
const settingsPath = 'settings.json';
const keyPairPath = 'keys';
const publicKeyPathSegment = 'pub';
const privateKeyPathSegment = 'pri';
const credsCachePath = join('cache', 'creds.json');

// ----------------
// Exported Classes
// ----------------

export class FlexdDotConfig extends DotConfig {
  private constructor() {
    super(dotFolderName);
  }

  public static async create() {
    return new FlexdDotConfig();
  }

  public async getSettingsPath(): Promise<string> {
    return join(this.path, settingsPath);
  }

  public async profileExists(name: string): Promise<boolean> {
    let settings: any = await this.readJson(settingsPath);
    return settings && settings.profiles && settings.profiles[name] !== undefined;
  }

  public async listProfileNames(): Promise<string[]> {
    let settings: any = await this.readJson(settingsPath);
    settings = settings || {};
    settings.profiles = settings.profiles || {};
    return Object.keys(settings.profiles);
  }

  public async getDefaultProfile(): Promise<string | undefined> {
    const settings: any = await this.readJson(settingsPath);
    return settings && settings.defaults ? settings.defaults.profile : undefined;
  }

  public async setDefaultProfile(name: string): Promise<void> {
    let settings: any = await this.readJson(settingsPath);
    settings = settings || {};
    settings.defaults = settings.defaults || {};
    settings.defaults.profile = name;
    await this.writeJson(settingsPath, settings);
  }

  public async getPublicKey(name: string, kid: string): Promise<string | undefined> {
    let settings: any = await this.readJson(settingsPath);
    const keyPair = settings && settings.keyPairs && settings.keyPairs[name] ? settings.keyPairs[name][kid] : undefined;
    if (keyPair && keyPair.publicKeyPath) {
      const buffer = await this.readBinary(keyPair.publicKeyPath);
      if (buffer) {
        return buffer.toString();
      }
    }

    return undefined;
  }

  public async getPrivateKey(name: string, kid: string): Promise<string | undefined> {
    let settings: any = await this.readJson(settingsPath);
    const keyPair = settings && settings.keyPairs && settings.keyPairs[name] ? settings.keyPairs[name][kid] : undefined;
    if (keyPair && keyPair.privateKeyPath) {
      const buffer = await this.readBinary(keyPair.privateKeyPath);
      if (buffer) {
        return buffer.toString();
      }
    }

    return undefined;
  }

  public async setKeyPair(
    name: string,
    privateKey: string,
    publicKey: string,
    kid: string,
    overWrite: boolean = false
  ): Promise<boolean> {
    let settings: any = await this.readJson(settingsPath);
    settings = settings || {};
    settings.keyPairs = settings.keyPairs || {};
    const keyPairs = (settings.keyPairs[name] = settings.keyPairs[name] || {});
    if (keyPairs[kid] !== undefined && !overWrite) {
      return false;
    }

    const privateKeyPath = join(keyPairPath, name, kid, privateKeyPathSegment);
    const publicKeyPath = join(keyPairPath, name, kid, publicKeyPathSegment);

    await Promise.all([
      this.writeBinary(privateKeyPath, Buffer.from(privateKey)),
      this.writeBinary(publicKeyPath, Buffer.from(publicKey)),
    ]);

    const entry = {
      publicKeyPath,
      privateKeyPath,
      generatedOn: new Date().toLocaleString(),
    };

    keyPairs[kid] = entry;
    await this.writeJson(settingsPath, settings);
    return true;
  }

  public async getProfile(name?: string): Promise<any> {
    let settings: any = await this.readJson(settingsPath);
    if (settings) {
      if (!name && settings.defaults) {
        name = settings.defaults.profile;
      }
      if (name && settings.profiles) {
        return settings.profiles[name];
      }
    }

    return undefined;
  }

  public async setProfile(name: string, profile: any, overWrite: boolean): Promise<void> {
    let settings: any = await this.readJson(settingsPath);
    settings = settings || {};
    settings.profiles = settings.profiles || {};
    if (settings.profiles[name] !== undefined && !overWrite) {
      const message = `The '${name}' profile already exists.`;
      throw new Error(message);
    }
    if (!settings.profiles[name]) {
      profile.created = new Date().toLocaleString();
      profile.updated = profile.created;
    } else {
      profile.updated = new Date().toLocaleString();
    }
    settings.profiles[name] = profile;
    await this.writeJson(settingsPath, settings);
  }

  public async copyProfile(source: string, target: string, overWrite: boolean): Promise<any> {
    let settings: any = await this.readJson(settingsPath);
    settings = settings || {};
    settings.profiles = settings.profiles || {};
    const profile = settings.profiles[source];
    if (profile === undefined) {
      const message = `The '${source}' profile does not exist.`;
      throw new Error(message);
    }
    if (settings.profiles[target] !== undefined && !overWrite) {
      const message = `The '${target}' profile already exists.`;
      throw new Error(message);
    }
    const copy = clone(profile);
    copy.created = new Date().toLocaleString();
    copy.updated = copy.created;
    settings.profiles[target] = copy;

    await this.writeJson(settingsPath, settings);
    return profile;
  }

  public async removeProfile(target: string) {
    let settings: any = await this.readJson(settingsPath);
    settings = settings || {};
    settings.profiles = settings.profiles || {};
    settings.profiles[target] = undefined;
    await this.writeJson(settingsPath, settings);
  }

  public async renameProfile(source: string, target: string, overWrite: boolean): Promise<any> {
    let settings: any = await this.readJson(settingsPath);
    settings = settings || {};
    settings.profiles = settings.profiles || {};
    const profile = settings.profiles[source];
    if (profile === undefined) {
      const message = `The '${source}' profile does not exist.`;
      throw new Error(message);
    }
    if (settings.profiles[target] !== undefined && !overWrite) {
      const message = `The '${target}' profile already exists.`;
      throw new Error(message);
    }
    profile.updated = new Date().toLocaleString();
    settings.profiles[target] = profile;
    settings.profiles[source] = undefined;

    if (settings.defaults && settings.defaults.profile === source) {
      settings.defaults = settings.defaults || {};
      settings.defaults.profile = target;
    }

    await this.writeJson(settingsPath, settings);
    return profile;
  }

  public async getCachedCreds(name: string, kid: string): Promise<any> {
    const cache: any = await this.readJson(credsCachePath);
    return cache && cache[name] && cache[name][kid] ? cache[name][kid] : undefined;
  }

  public async setCachedCreds(name: string, kid: string, creds: any) {
    let cache: any = await this.readJson(credsCachePath);
    cache = cache || {};
    cache[name] = cache[name] || {};
    cache[name][kid] = creds;
    await this.writeJson(credsCachePath, cache);
  }
}
