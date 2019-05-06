import { IAwsConfig, AwsCreds } from '@5qtrs/aws-config';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { AccountTable } from './tables/AccountTable';

// ----------------
// Exported Classes
// ----------------

export class OpsDataAwsProvider {
  public static async create(creds: AwsCreds, config: OpsDataAwsConfig) {
    return new OpsDataAwsProvider(creds, config);
  }
  private creds: AwsCreds;
  private config: OpsDataAwsConfig;
  private mainAwsConfig?: IAwsConfig;

  private constructor(creds: AwsCreds, config: OpsDataAwsConfig) {
    this.creds = creds;
    this.config = config;
  }

  public async getAwsConfigForMain(): Promise<IAwsConfig> {
    if (!this.mainAwsConfig) {
      const creds = this.config.userAccountEnabled
        ? this.creds.asRole(this.config.mainAccountId, this.config.mainAccountRole)
        : this.creds;
      this.mainAwsConfig = {
        creds,
        account: this.config.mainAccountId,
        region: this.config.mainRegion,
        prefix: this.config.mainPrefix,
      };
    }
    return this.mainAwsConfig;
  }

  public async getAwsConfig(accountName: string, region: string, prefix?: string): Promise<IAwsConfig> {
    const awsConfig = await this.getAwsConfigForMain();
    const dynamo = await AwsDynamo.create(awsConfig);
    const accountTable = await AccountTable.create(this.config, dynamo);
    const account = await accountTable.get(accountName);
    const creds = this.creds.asRole(account.id, account.role);
    return {
      creds,
      account: account.id,
      region,
      prefix,
    };
  }
}
