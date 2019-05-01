import { AwsCreds, IAwsConfig } from '@5qtrs/aws-config';

// ------------------
// Internal Constants
// ------------------

const credentialsMinExpiration = 5 * 60 * 1000;
const defaultDelimiter = '-';

// ----------------
// Exported Classes
// ----------------

export class AwsBase<TAws extends new (...args: any[]) => any> {
  private account: string;
  private region: string;
  private prefix: string;
  private delimiter: string;
  private creds?: AwsCreds;
  private aws?: TAws;

  protected constructor(awsConfig: IAwsConfig, delimiter?: string) {
    this.account = awsConfig.account;
    this.region = awsConfig.region;
    this.prefix = awsConfig.prefix || '';
    this.delimiter = delimiter || defaultDelimiter;
    this.creds = awsConfig.creds;
  }

  protected onGetAws(options: any): InstanceType<TAws> {
    throw new Error(`The 'onGetAws' method must be implemented in the derived class.`);
  }

  protected async getAws(): Promise<InstanceType<TAws>> {
    if (!this.aws) {
      const options: any = {
        region: this.region,
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

  protected get awsCreds(): AwsCreds | undefined {
    return this.creds;
  }

  protected get awsAccount(): string {
    return this.account;
  }

  protected get awsRegion(): string {
    return this.region;
  }

  protected get config(): IAwsConfig {
    return {
      creds: this.creds,
      account: this.account,
      region: this.region,
      prefix: this.prefix,
    };
  }

  protected getFullName(name: string): string {
    const fullPrefix = this.getFullPrefix();
    return fullPrefix ? `${fullPrefix}${name}` : name;
  }

  protected getShortName(fullName: string): string {
    const fullPrefix = this.getFullPrefix();
    return fullPrefix && fullName.indexOf(fullPrefix) === 0 ? fullName.substring(fullPrefix.length) : fullName;
  }

  protected getPrefix(): string {
    return this.prefix;
  }

  protected getFullPrefix(): string {
    const prefix = this.getPrefix();
    return prefix ? `${prefix}${this.delimiter}` : '';
  }
}
