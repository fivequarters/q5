import { IOpsDataContextFactory, IOpsDataContext } from '@5qtrs/ops-data';
import { IConfig } from '@5qtrs/config';
import { AwsCreds } from '@5qtrs/aws-cred';
import { AwsDeployment } from '@5qtrs/aws-deployment';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { OpsDataAwsContext } from './OpsDataAwsContext';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class OpsDataAwsContextFactory implements IOpsDataContextFactory {
  public static async create(creds: AwsCreds, deployment: AwsDeployment) {
    return new OpsDataAwsContextFactory(creds, deployment);
  }
  private creds: AwsCreds;
  private deployment: AwsDeployment;

  private constructor(creds: AwsCreds, deployment: AwsDeployment) {
    this.creds = creds;
    this.deployment = deployment;
  }

  public async create(config: IConfig): Promise<IOpsDataContext> {
    const awsConfig = await OpsDataAwsConfig.create(config);
    const dynamo = await AwsDynamo.create({ creds: this.creds, deployment: this.deployment });
    return OpsDataAwsContext.create(awsConfig, dynamo);
  }
}
