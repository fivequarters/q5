import { IConfig } from '@5qtrs/config';
import * as Constants from '@5qtrs/constants';
import { IOpsDeployment, OpsDataException } from '@5qtrs/ops-data';

// ------------------
// Internal Constants
// ------------------

const defaultDefaultLimit = 25;
const defaultMaxLimit = 100;
const defaultUserAccountEnabled = false;
const defaultRegion = 'us-west-2';
const defaultGovCloudRegion = 'us-gov-west-1';
const defaultMainAccountName = 'main';
const defaultMainPrefix = 'ops';
const defaultMonoRepoName = 'fusebit-mono';
const defaultMonoInstanceType = 't3.xlarge';
const defaultMonoApiPort = 80;
const defaultUbuntuServerVersion = '20.04';
const defaultMonoInstanceProfileName = 'fusebit-EC2-instance';
const defaultGrafanaInstanceProfileName = 'fusebit-grafana-instance';
const defaultMonoHealthCheckGracePeriod = 300;
const defaultCronFilter = 'ctx => true;';
const defaultCronMaxExecutionsPerWindow = 120;
const defaultMonoAlbDeploymentName = 'deployment';
const defaultMonoAlbDefaultTargetName = 'main';
const defaultMonoAlbTargetNamePrefix = 'stack';
const defaultMonoAlbHealthCheckPath = '/v1/health';
const defaultMonoAlbHealthCheckDisabledPath = '/v1/healthz';
const defaultLambdaExecutionRoleName = 'fusebit-lambda-execution';
const defaultDwhExportRoleName = 'fusebit-dwh-export';
const defaultCronExecutorRoleName = 'fusebit-cron-executor';
const defaultCronSchedulerRoleName = 'fusebit-cron-scheduler';
const defaultAnalyticsRoleName = 'fusebit-analytics';
const defaultBuilderRoleName = 'fusebit-builder';
const defaultFunctionRoleName = 'fusebit-function';
const defaultFunctionPermissionlessRoleName = 'fusebit-function-permissionless';
const defaultGovCloud = false;
const defaultBackupRoleName = 'fusebit-backup-role';
const defaultAuroraDatabaseName = 'fusebit';
const defaultAuroraMasterUsername = 'fusebit';
const defaultDiscoveryDomainName = 'fusebit.internal';
const defaultTempoBucketPrefix = 'tempo-bucket-fusebit-';
const defaultLokiBucketPrefix = 'loki-bucket-fusebit-';
const defaultGrafanaBootstrapBucket = 'grafana-bootstrap-';

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

  public get auroraMasterUsername(): string {
    return (this.config.value('auroraMasterUsername') as string) || defaultAuroraMasterUsername;
  }

  public get auroraDatabaseName(): string {
    return (this.config.value('auroraDatabaseName') as string) || defaultAuroraDatabaseName;
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

  public get credentialsProvider(): string {
    return this.config.value('credentialsProvider') as string;
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
  public get backupRoleName(): string {
    return (this.config.value('backupRoleName') as string) || defaultBackupRoleName;
  }
  public get mainRegion(): string {
    return (this.config.value('mainRegion') as string) || (this.govCloud ? defaultGovCloudRegion : defaultRegion);
  }

  public get govCloud(): boolean {
    return (this.config.value('govCloud') as boolean) || defaultGovCloud;
  }

  public get arnPrefix(): string {
    return this.govCloud ? 'arn:aws-us-gov' : 'arn:aws';
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

  public get monoApiPort(): number {
    return (this.config.value('monoApiPort') as number) || defaultMonoApiPort;
  }

  public get monoAlbApiPort(): number {
    return (this.config.value('monoAlbApiPort') as number) || defaultMonoApiPort;
  }

  public get monoAlbDeploymentName(): string {
    return (this.config.value('monoAlbDeploymentName') as string) || defaultMonoAlbDeploymentName;
  }

  public get monoAlbDefaultTargetName(): string {
    return (this.config.value('monoAlbDefaultTargetName') as string) || defaultMonoAlbDefaultTargetName;
  }

  public get monoAlbTargetNamePrefix(): string {
    return (this.config.value('monoAlbTargetNamePrefix') as string) || defaultMonoAlbTargetNamePrefix;
  }

  public get monoAlbHealthCheckPath(): string {
    return (this.config.value('monoAlbHealthCheckPath') as string) || defaultMonoAlbHealthCheckPath;
  }

  public get monoAlbHealthCheckDisabledPath(): string {
    return (this.config.value('monoAlbHealthCheckDisabledPath') as string) || defaultMonoAlbHealthCheckDisabledPath;
  }

  public get ubuntuServerVersion(): string {
    return (this.config.value('ubuntuServerVersion') as string) || defaultUbuntuServerVersion;
  }

  public get lambdaExecutionRoleName(): string {
    return (this.config.value('lambdaExecutionRoleName') as string) || defaultLambdaExecutionRoleName;
  }

  public get dwhExportRoleName(): string {
    return (this.config.value('dwhExportRoleName') as string) || defaultDwhExportRoleName;
  }

  public get cronExecutorRoleName(): string {
    return (this.config.value('cronExecutorRoleName') as string) || defaultCronExecutorRoleName;
  }

  public get cronSchedulerRoleName(): string {
    return (this.config.value('cronSchedulerRoleName') as string) || defaultCronSchedulerRoleName;
  }

  public get analyticsRoleName(): string {
    return (this.config.value('analyticsRoleName') as string) || defaultAnalyticsRoleName;
  }

  public get builderRoleName(): string {
    return (this.config.value('builderRoleName') as string) || defaultBuilderRoleName;
  }

  public get functionRoleName(): string {
    return (this.config.value('functionRoleName') as string) || defaultFunctionRoleName;
  }

  public get functionPermissionlessRoleName(): string {
    return (this.config.value('functionPermissionlessRoleName') as string) || defaultFunctionPermissionlessRoleName;
  }

  public get monoInstanceProfileName(): string {
    return (this.config.value('monoInstanceProfileName') as string) || defaultMonoInstanceProfileName;
  }

  public get monoGrafanaProfileName(): string {
    return (this.config.value('monoGrafanaProfileName') as string) || defaultGrafanaInstanceProfileName;
  }

  public get monoInstanceProfile(): string {
    return (
      (this.config.value('monoInstanceProfile') as string) ||
      `${this.arnPrefix}:iam::${this.mainAccountId}:instance-profile/${defaultMonoInstanceProfileName}`
    );
  }

  public get monoHealthCheckGracePeriod(): number {
    return (this.config.value('monoHealthCheckGracePeriod') as number) || defaultMonoHealthCheckGracePeriod;
  }

  public get dataWarehouseKeyBase64(): string {
    const dataWarehouseKey = process.env.FUSEBIT_GC_BQ_KEY_BASE64;
    if (!dataWarehouseKey) {
      throw OpsDataException.configNotProvided('env variable FUSEBIT_GC_BQ_KEY_BASE64');
    }

    return dataWarehouseKey;
  }

  public get iamPermissionsBoundary(): string | undefined {
    return (this.config.value('iamPermissionsBoundary') as string) || undefined;
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

  public getS3Bucket(deployment: IOpsDeployment): string {
    return Constants.get_deployment_s3_bucket(deployment);
  }

  public value(settingName: string) {
    return this.config.value(settingName);
  }

  public getDiscoveryDomainName() {
    return defaultDiscoveryDomainName;
  }

  public getTempoBucketPrefix() {
    return defaultTempoBucketPrefix;
  }

  public getLokiBucketPrefix() {
    return defaultLokiBucketPrefix;
  }

  public getGrafanaBootstrapBucket() {
    return defaultGrafanaBootstrapBucket;
  }
}
