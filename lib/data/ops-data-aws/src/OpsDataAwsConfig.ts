import { IConfig } from '@5qtrs/config';
import { OpsDataException } from '@5qtrs/ops-data';

// ------------------
// Internal Constants
// ------------------

const defaultDefaultLimit = 25;
const defaultMaxLimit = 100;
const defaultUserAccountEnabled = false;
const defaultRegion = 'us-west-2';

// ----------------
// Exported Classes
// ----------------

export class OpsDataAwsConfig {
  public static async create(config: IConfig) {
    return new OpsDataAwsConfig(config);
  }
  private config: IConfig;

  private constructor(config: IConfig) {
    this.config = config;
  }

  public get userAccountEnabled(): boolean {
    return (this.config.value('userAccountEnabled') as boolean) || defaultUserAccountEnabled;
  }

  public get mainAccountId(): string {
    const value = this.config.value('mainAccountId');
    if (!value) {
      throw OpsDataException.configNotProvided('mainAccountId');
    }
    return value as string;
  }

  public get mainAccountRole(): string {
    const value = this.config.value('mainAccountRole');
    if (!value) {
      throw OpsDataException.configNotProvided('mainAccountRole');
    }
    return value as string;
  }

  public get mainRegion(): string {
    return (this.config.value('mainRegion') as string) || defaultRegion;
  }

  public get accountDefaultLimit(): number {
    return (
      (this.config.value('accountDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get accountMaxLimit(): number {
    return (
      (this.config.value('accountMaxLimit') as number) || (this.config.value('maxLimit') as number) || defaultMaxLimit
    );
  }

  public get domainDefaultLimit(): number {
    return (
      (this.config.value('domainDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get domainMaxLimit(): number {
    return (
      (this.config.value('domainMaxLimit') as number) || (this.config.value('maxLimit') as number) || defaultMaxLimit
    );
  }

  public get networkDefaultLimit(): number {
    return (
      (this.config.value('networkDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get networkMaxLimit(): number {
    return (
      (this.config.value('networkMaxLimit') as number) || (this.config.value('maxLimit') as number) || defaultMaxLimit
    );
  }
}
