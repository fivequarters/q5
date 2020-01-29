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
  public static async create(creds: AwsCreds, globalOpsDataAwsContext?: OpsDataAwsContext) {
    return new OpsDataAwsContextFactory(creds, globalOpsDataAwsContext);
  }
  private creds: AwsCreds;
  private globalOpsDataAwsContext?: OpsDataAwsContext;

  private constructor(creds: AwsCreds, globalOpsDataAwsContext?: OpsDataAwsContext) {
    this.creds = creds;
    this.globalOpsDataAwsContext = globalOpsDataAwsContext;
  }

  public async create(config: IConfig): Promise<OpsDataAwsContext> {
    const awsConfig = await OpsDataAwsConfig.create(config);
    const awsProvider = await OpsDataAwsProvider.create(this.creds, awsConfig);
    return OpsDataAwsContext.create(awsConfig, awsProvider, this.globalOpsDataAwsContext);
  }
}
