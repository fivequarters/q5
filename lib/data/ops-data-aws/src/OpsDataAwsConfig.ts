import { IConfig } from '@5qtrs/config';
import { OpsDataException } from '@5qtrs/ops-data';

// ------------------
// Internal Constants
// ------------------

const defaultDefaultLimit = 25;
const defaultMaxLimit = 100;
const defaultUserAccountEnabled = false;
const defaultRegion = 'us-west-2';
const defaultMainAccountName = 'main';
const defaultMainPrefix = 'ops';
const defaultMonoRepoName = 'fusebit-mono';
const defaultMonoInstanceType = 't3.medium';
const defaultMonoLogPort = 5002;
const defaultMonoApiPort = 3001;
const defaultUbuntuServerVersion = '18.04';
const defaultMonoInstanceProfile = 'arn:aws:iam::321612923577:instance-profile/Flexd-EC2-Instance';
const defaultMonoHealthCheckGracePeriod = 180;
const defaultCronFilter = 'ctx => true;';
const defaultCronMaxExecutionsPerWindow = 120;

// ----------------
// Exported Classes
// ----------------

export class OpsDataAwsConfig implements IConfig {
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
    if (!value && this.userAccountEnabled) {
      throw OpsDataException.configNotProvided('mainAccountId');
    }
    return value as string;
  }

  public get mainAccountName(): string {
    return (this.config.value('mainAccountName') as string) || defaultMainAccountName;
  }

  public get mainAccountRole(): string {
    const value = this.config.value('mainAccountRole');
    if (!value && this.userAccountEnabled) {
      throw OpsDataException.configNotProvided('mainAccountRole');
    }
    return value as string;
  }

  public get mainRegion(): string {
    return (this.config.value('mainRegion') as string) || defaultRegion;
  }

  public get mainPrefix(): string {
    return (this.config.value('mainPrefix') as string) || defaultMainPrefix;
  }

  public get monoRepoName(): string {
    return (this.config.value('monoRepoName') as string) || defaultMonoRepoName;
  }

  public get monoInstanceType(): string {
    return (this.config.value('monoInstanceType') as string) || defaultMonoInstanceType;
  }

  public get monoLogPort(): number {
    return (this.config.value('monoLogPort') as number) || defaultMonoLogPort;
  }

  public get monoApiPort(): number {
    return (this.config.value('monoApiPort') as number) || defaultMonoApiPort;
  }

  public get monoAlbLogPort(): number {
    return (this.config.value('monoAlbLogPort') as number) || defaultMonoLogPort;
  }

  public get monoAlbApiPort(): number {
    return (this.config.value('monoAlbApiPort') as number) || defaultMonoApiPort;
  }

  public get ubuntuServerVersion(): string {
    return (this.config.value('ubuntuServerVersion') as string) || defaultUbuntuServerVersion;
  }

  public get monoInstanceProfile(): string {
    return (this.config.value('monoInstanceProfile') as string) || defaultMonoInstanceProfile;
  }

  public get monoHealthCheckGracePeriod(): number {
    return (this.config.value('monoHealthCheckGracePeriod') as number) || defaultMonoHealthCheckGracePeriod;
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

  public get deploymentDefaultLimit(): number {
    return (
      (this.config.value('deploymentDefaultLimit') as number) ||
      (this.config.value('defaultLimit') as number) ||
      defaultDefaultLimit
    );
  }

  public get deploymentMaxLimit(): number {
    return (
      (this.config.value('deploymentMaxLimit') as number) ||
      (this.config.value('maxLimit') as number) ||
      defaultMaxLimit
    );
  }

  public get cronFilter(): string {
    return (this.config.value('cronFilter') as string) || defaultCronFilter;
  }

  public get cronMaxExecutionsPerWindow(): number {
    return (this.config.value('cronMaxExecutionsPerWindow') as number) || defaultCronMaxExecutionsPerWindow;
  }

  public getS3Bucket(options: { region: string; prefix?: string }): string {
    return `fusebit-${options.prefix || 'global'}-${options.region}`;
  }

  public value(settingName: string) {
    return this.config.value(settingName);
  }
}
