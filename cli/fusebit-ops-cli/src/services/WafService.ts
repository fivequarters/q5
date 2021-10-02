import { IAwsConfig } from '@5qtrs/aws-base';
import { WAFV2, DynamoDB } from 'aws-sdk';
import { AwsCreds, IAwsCredentials } from 'lib/aws/aws-cred/src/AwsCreds';
import { IExecuteInput } from 'lib/node/cli/src/Command';
import { ExecuteService } from '.';
import { OpsService } from './OpsService';

export class WafService {
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    const opsDataContext = await opsSvc.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    return new WafService(opsSvc, execSvc, config, credentials, input);
  }

  private constructor(
    private opsService: OpsService,
    private executeService: ExecuteService,
    private config: IAwsConfig,
    private creds: IAwsCredentials,
    private input: IExecuteInput
  ) {}

  private async getWafSdk(config: any) {
    return new WAFV2({
      ...config,
      accessKeyId: this.creds.accessKeyId as string,
      secretAccessKey: this.creds.secretAccessKey as string,
      sessionToken: this.creds.sessionToken as string,
    });
  }

  private async getDynamoSDK(config: any) {
    return new DynamoDB({
      ...config,
      accessKeyId: this.creds.accessKeyId as string,
      secretAccessKey: this.creds.secretAccessKey as string,
      sessionToken: this.creds.sessionToken as string,
    });
  }

  private getRegionOfDeployment(deploymentName: string) {
    const dynamoSdk = await this.getDynamoSDK({
      region: this.config.region,
    });
  }
}
