import { IAccountDataContextFactory } from '@5qtrs/account-data';
import { IConfig } from '@5qtrs/config';
import { IAwsConfig } from '@5qtrs/aws-config';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AccountDataAwsContext } from './AccountDataAwsContext';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class AccountDataAwsContextFactory implements IAccountDataContextFactory {
  public static async create(awsConfig: IAwsConfig) {
    return new AccountDataAwsContextFactory(awsConfig);
  }

  private awsConfig: IAwsConfig;

  private constructor(awsConfig: IAwsConfig) {
    this.awsConfig = awsConfig;
  }

  public async create(config: IConfig): Promise<AccountDataAwsContext> {
    const fullConfig = await AccountDataAwsConfig.create(config);
    const dynamo = await AwsDynamo.create(this.awsConfig);
    return AccountDataAwsContext.create(fullConfig, dynamo);
  }
}
