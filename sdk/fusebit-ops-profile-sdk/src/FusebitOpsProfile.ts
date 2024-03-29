import { FusebitOpsDotConfig } from './FusebitOpsDotConfig';
import { FusebitOpsProfileException } from './FusebitOpsProfileException';

// ------------------
// Internal Constants
// ------------------

const defaultDefaultProfileName = 'default';

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitOpsProfileSettings {
  awsMainAccount: string;
  awsUserName?: string;
  awsSecretAccessKey?: string;
  awsAccessKeyId: string;
  awsUserAccount?: string;
  awsMainRole?: string;
  credentialsProvider?: string;
  govCloud?: boolean;
  globalProfile?: string;
}

export interface IFusebitOpsProfile extends IFusebitOpsProfileSettings {
  name: string;
  created: string;
  updated: string;
}

// ----------------
// Exported Classes
// ----------------

export class FusebitOpsProfile {
  public static async create() {
    const dotConfig = await FusebitOpsDotConfig.create();
    return new FusebitOpsProfile(dotConfig);
  }
  private dotConfig: FusebitOpsDotConfig;

  private constructor(dotConfig: FusebitOpsDotConfig) {
    this.dotConfig = dotConfig;
  }

  public get defaultDefaultProfileName() {
    return defaultDefaultProfileName;
  }

  public async getSettingsPath(): Promise<string> {
    return this.dotConfig.getSettingsPath();
  }

  public async profileExists(name: string): Promise<boolean> {
    return this.dotConfig.profileExists(name);
  }

  public async getDefaultProfileName(): Promise<string | undefined> {
    return this.dotConfig.getDefaultProfileName();
  }

  public async setDefaultProfileName(name: string): Promise<void> {
    await this.getProfileOrThrow(name);
    return this.dotConfig.setDefaultProfileName(name);
  }

  public async listProfiles(): Promise<IFusebitOpsProfile[]> {
    const names = await this.dotConfig.listProfileNames();
    const profiles: IFusebitOpsProfile[] = [];
    for (const name of names) {
      const profile = await this.getProfile(name);
      if (profile) {
        profile.name = name;
        profiles.push(profile);
      }
    }
    return profiles;
  }

  public async getProfile(name: string): Promise<IFusebitOpsProfile | undefined> {
    const profile = (await this.dotConfig.getProfile(name)) as IFusebitOpsProfile;
    if (profile) {
      profile.name = name;
    }
    return profile || undefined;
  }

  public async getProfileOrThrow(name: string): Promise<IFusebitOpsProfile> {
    const profile = await this.getProfile(name);
    if (profile === undefined) {
      throw FusebitOpsProfileException.profileDoesNotExist(name);
    }
    return profile;
  }

  public async getProfileOrDefault(name?: string): Promise<IFusebitOpsProfile | undefined> {
    if (!name) {
      name = await this.dotConfig.getDefaultProfileName();
      if (!name) {
        return undefined;
      }
    }
    return this.getProfile(name);
  }

  public async getProfileOrDefaultOrThrow(name?: string): Promise<IFusebitOpsProfile> {
    if (!name) {
      name = await this.dotConfig.getDefaultProfileName();
      if (!name) {
        throw FusebitOpsProfileException.noDefaultProfile();
      }
    }

    return this.getProfileOrThrow(name);
  }

  public async addProfile(name: string, settings: IFusebitOpsProfileSettings): Promise<IFusebitOpsProfile> {
    if (
      !settings.credentialsProvider &&
      (!settings.awsUserName || !settings.awsAccessKeyId || !settings.awsSecretAccessKey)
    ) {
      throw new Error(
        "A profile must sepecify either the 'credentialsProvider' or 'awsUserName', 'awsAccessKeyId', and 'awsSecretAccessKey'."
      );
    }
    if (settings.govCloud && !settings.globalProfile) {
      throw new Error("A profile that has 'govCloud' set must also specify 'globalProfile'.");
    }

    const created = new Date().toLocaleString();

    const fullProfileToAdd = {
      created,
      updated: created,
      awsMainAccount: settings.awsMainAccount,
      awsUserName: settings.awsUserName || undefined,
      awsSecretAccessKey: settings.awsSecretAccessKey || undefined,
      awsAccessKeyId: settings.awsAccessKeyId || undefined,
      awsUserAccount: settings.awsUserAccount || undefined,
      awsMainRole: settings.awsMainRole || undefined,
      credentialsProvider: settings.credentialsProvider || undefined,
      govCloud: settings.govCloud || false,
      globalProfile: settings.globalProfile || undefined,
    };

    const profile = await this.dotConfig.setProfile(name, fullProfileToAdd);
    profile.name = name;

    const defaultProfileName = await this.getDefaultProfileName();
    if (!defaultProfileName) {
      await this.setDefaultProfileName(name);
    }

    return profile;
  }

  public async updateProfile(name: string, settings: IFusebitOpsProfileSettings): Promise<IFusebitOpsProfile> {
    const profile = await this.getProfileOrThrow(name);

    profile.awsMainAccount = settings.awsMainAccount;
    profile.awsUserName = settings.awsUserName;
    profile.awsSecretAccessKey = settings.awsSecretAccessKey;
    profile.awsAccessKeyId = settings.awsAccessKeyId;

    if (settings.credentialsProvider !== undefined) {
      profile.credentialsProvider = settings.credentialsProvider || undefined;
    }
    if (settings.awsUserAccount !== undefined) {
      profile.awsUserAccount = settings.awsUserAccount || undefined;
    }
    if (settings.awsMainRole !== undefined) {
      profile.awsMainRole = settings.awsMainRole || undefined;
    }
    profile.updated = new Date().toLocaleString();

    await this.dotConfig.setProfile(name, profile);
    profile.name = name;

    return profile;
  }

  public async copyProfile(name: string, copyTo: string, overWrite: boolean): Promise<IFusebitOpsProfile> {
    const profile = await this.getProfileOrThrow(name);
    const copyToExists = await this.profileExists(copyTo);

    if (copyToExists && !overWrite) {
      throw FusebitOpsProfileException.profileAlreadyExists(copyTo);
    }

    profile.created = new Date().toLocaleString();
    profile.updated = profile.created;

    await this.dotConfig.setProfile(copyTo, profile);
    profile.name = copyTo;

    return profile;
  }

  public async renameProfile(name: string, renameTo: string, overWrite: boolean): Promise<IFusebitOpsProfile> {
    const profile = await this.getProfileOrThrow(name);
    const renameToExists = await this.profileExists(renameTo);

    if (renameToExists && !overWrite) {
      throw FusebitOpsProfileException.profileAlreadyExists(renameTo);
    }

    profile.updated = new Date().toLocaleString();

    await this.dotConfig.setProfile(renameTo, profile);
    await this.dotConfig.removeProfile(name);
    profile.name = renameTo;

    return profile;
  }

  public async removeProfile(name: string): Promise<void> {
    await this.getProfileOrThrow(name);
    await this.dotConfig.removeProfile(name);
  }

  public async getCachedCreds(name: string, key: string): Promise<any> {
    return this.dotConfig.getCachedCreds(name, key);
  }

  public async setCachedCreds(name: string, key: string, creds: any): Promise<void> {
    return this.dotConfig.setCachedCreds(name, key, creds);
  }
}
