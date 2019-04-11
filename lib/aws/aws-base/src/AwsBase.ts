import { AwsCreds } from '@5qtrs/aws-cred';
import { AwsDeployment } from '@5qtrs/aws-deployment';

// ------------------
// Internal Constants
// ------------------

const credentialsMinExpiration = 5 * 60 * 1000;

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsOptions {
  creds?: AwsCreds;
  deployment: AwsDeployment;
}

// ----------------
// Exported Classes
// ----------------

export class AwsBase<TAws extends new (...args: any[]) => any> {
  private optionsProp: IAwsOptions;
  private aws?: TAws;

  protected constructor(options: IAwsOptions) {
    this.optionsProp = options;
  }

  protected onGetAws(options: any): InstanceType<TAws> {
    throw new Error(`The 'onGetAws' method must be implemented in the derived class.`);
  }

  protected async getAws(): Promise<InstanceType<TAws>> {
    if (!this.aws) {
      const options: any = {
        region: this.deployment.region.code,
        signatureVersion: 'v4',
      };
      if (this.creds) {
        const credentials = await this.creds.getCredentials();
        if (credentials.accessKeyId) {
          options.accessKeyId = credentials.accessKeyId;
        }
        if (credentials.secretAccessKey) {
          options.secretAccessKey = credentials.secretAccessKey;
        }
        if (credentials.sessionToken) {
          options.sessionToken = credentials.sessionToken;
        }
        if (credentials.expires) {
          const expireTimeout = credentials.expires - Date.now() - credentialsMinExpiration;
          setTimeout(() => {
            this.aws = undefined;
          }, expireTimeout);
        }
      }

      this.aws = this.onGetAws(options);
    }

    return this.aws as InstanceType<TAws>;
  }

  protected get creds() {
    return this.optionsProp.creds;
  }

  protected get deployment() {
    return this.optionsProp.deployment;
  }

  protected get options() {
    return this.optionsProp;
  }

  protected getPrefixedName(name: string) {
    return `${this.deployment.key}-${name}`;
  }

  protected getUnprefixedName(name: string) {
    return name.replace(`${this.deployment.key}-`, '');
  }
}
