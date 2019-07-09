import { IConfig } from '@5qtrs/config';

// ------------------
// Internal Constants
// ------------------

const defaultDefaultLimit = 25;
const defaultMaxLimit = 100;
const defaultGzipEnabled = true;

// ----------------
// Exported Classes
// ----------------

export class StorageDataAwsConfig {
  public static async create(config: IConfig) {
    return new StorageDataAwsConfig(config);
  }
  private config: IConfig;

  private constructor(config: IConfig) {
    this.config = config;
  }

  public get storageEntryDefaultLimit(): number {
    return (
      (this.config.value('storageEntryDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get storageEntryMaxLimit(): number {
    return (
      (this.config.value('storageEntryMaxLimit') as number) ||
      (this.config.value('maxLimit') as number) ||
      defaultMaxLimit
    );
  }

  public get gzipEnabled(): boolean {
    return this.config.value('gzipEnabled') !== undefined
      ? (this.config.value('gzipEnabled') as boolean)
      : defaultGzipEnabled;
  }
}
