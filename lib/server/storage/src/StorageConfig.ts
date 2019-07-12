import { IConfig } from '@5qtrs/config';

// ----------------
// Exported Classes
// ----------------

export class StorageConfig implements IConfig {
  public static async create(config: IConfig) {
    return new StorageConfig(config);
  }
  private config: IConfig;

  private constructor(config: IConfig) {
    this.config = config;
  }

  public value(settingsName: string) {
    return this.config.value(settingsName);
  }
}
