import { IOpsDataContextFactory, IOpsDataContext } from '@5qtrs/ops-data';
import { IConfig } from '@5qtrs/config';
import { AwsCreds } from '@5qtrs/aws-cred';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsContext } from './OpsDataAwsContext';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class OpsDataAwsContextFactory implements IOpsDataContextFactory {
  public static async create(creds: AwsCreds) {
    return new OpsDataAwsContextFactory(creds);
  }
  private creds: AwsCreds;

  private constructor(creds: AwsCreds) {
    this.creds = creds;
  }

  public async create(config: IConfig): Promise<IOpsDataContext> {
    const awsConfig = await OpsDataAwsConfig.create(config);
    const awsProvider = await OpsDataAwsProvider.create(this.creds, awsConfig);
    return OpsDataAwsContext.create(awsConfig, awsProvider);
  }
}
