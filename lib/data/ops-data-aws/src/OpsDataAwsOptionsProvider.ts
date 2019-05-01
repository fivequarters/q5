import { AwsCreds } from '@5qtrs/aws-cred';
import { AwsDeployment } from '@5qtrs/aws-deployment';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class OpsDataAwsOptionsProvider {
  public static async create(creds: AwsCreds, config: OpsDataAwsConfig) {
    return new OpsDataCredsProvider(creds, config);
  }
  private creds: AwsCreds;
  private config: OpsDataAwsConfig;
  private mainCreds?: AwsCreds;
  private mainDeployment?: AwsDeployment;

  private constructor(creds: AwsCreds, config: OpsDataAwsConfig) {
    this.creds = creds;
    this.config = config;
  }

  public async getMainCreds() {
    if (!this.mainCreds) {
      if (!this.config.userAccountEnabled) {
        this.mainCreds = this.creds;
      } else {
        const account = this.config.mainAccountId;
        const name = this.config.mainAccountRole;
        this.mainCreds = this.creds.asRole({ account, name });
      }
    }
    return this.mainCreds;
  }

  public async getMainAwsOptions() {}
}
