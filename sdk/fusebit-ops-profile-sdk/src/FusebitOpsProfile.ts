import { FusebitOpsDotConfig } from './FusebitOpsDotConfig';
import { FusebitOpsProfileException } from './FusebitOpsProfileException';

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitOpsProfileSettings {
  awsMainAccount: string;
  awsUserName: string;
  awsSecretAccessKey: string;
  awsAccessKeyId: string;
  awsUserAccount?: string;
  awsMainRole?: string;
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
    const created = new Date().toLocaleDateString();

    const fullProfileToAdd = {
      created,
      updated: created,
      awsMainAccount: settings.awsMainAccount,
      awsUserName: settings.awsUserName,
      awsSecretAccessKey: settings.awsSecretAccessKey,
      awsAccessKeyId: settings.awsAccessKeyId,
      awsUserAccount: settings.awsUserAccount || undefined,
      awsMainRole: settings.awsMainRole || undefined,
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
}
