import { IAccountDataContextFactory } from '@5qtrs/account-data';
import { IConfig } from '@5qtrs/config';
import { AwsCreds } from '@5qtrs/aws-cred';
import { AwsDeployment } from '@5qtrs/aws-deployment';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AccountDataAwsContext } from './AccountDataAwsContext';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class AccountDataAwsContextFactory implements IAccountDataContextFactory {
  public static async create(creds: AwsCreds, deployment: AwsDeployment) {
    return new AccountDataAwsContextFactory(creds, deployment);
  }
  private creds: AwsCreds;
  private deployment: AwsDeployment;

  private constructor(creds: AwsCreds, deployment: AwsDeployment) {
    this.creds = creds;
    this.deployment = deployment;
  }

  public async create(config: IConfig): Promise<AccountDataAwsContext> {
    const awsConfig = await AccountDataAwsConfig.create(config);
    const dynamo = await AwsDynamo.create({ creds: this.creds, deployment: this.deployment });
    return AccountDataAwsContext.create(awsConfig, dynamo);
  }
}
