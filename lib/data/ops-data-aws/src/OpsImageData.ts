import { DataSource } from '@5qtrs/data';
import { IOpsImageData, IOpsImage } from '@5qtrs/ops-data';
import { AwsEcr } from '@5qtrs/aws-ecr';
import { OpsDataTables } from './OpsDataTables';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class OpsImageData extends DataSource implements IOpsImageData {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider, tables: OpsDataTables) {
    const awsConfig = await provider.getAwsConfigForMain();
    const awsEcr = await AwsEcr.create(awsConfig);
    return new OpsImageData(config, awsEcr);
  }

  private config: OpsDataAwsConfig;
  private awsEcr: AwsEcr;

  private constructor(config: OpsDataAwsConfig, awsEcr: AwsEcr) {
    super();
    this.config = config;
    this.awsEcr = awsEcr;
  }

  public async isSetup(): Promise<boolean> {
    return this.awsEcr.repositoryExists(this.config.monoRepoName);
  }

  public async setup(): Promise<void> {
    await this.awsEcr.createRepository(this.config.monoRepoName);
  }

  public async publish(tag: string): Promise<void> {
    return this.awsEcr.pushImage(this.config.monoRepoName, tag);
  }

  public async pull(tag: string): Promise<void> {
    return this.awsEcr.pullImage(this.config.monoRepoName, tag);
  }

  public async list(): Promise<IOpsImage[]> {
    return this.awsEcr.describeImages(this.config.monoRepoName);
  }
}
