import AWS from 'aws-sdk';

import { IExecuteInput } from '@5qtrs/cli';
import { OpsDataAwsConfig } from '@5qtrs/ops-data-aws';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { IAwsConfig } from '@5qtrs/aws-config';
import { ExecuteService } from './ExecuteService';
import { OpsService } from './OpsService';

const TG_PARTIAL_POSTFIX = '-deployment-stack';

export class HealthCheckService {
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    const opsDataContext = await opsSvc.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    const opsAwsConfig = await OpsDataAwsConfig.create((await opsSvc.getOpsDataContextImpl()).config);
    return new HealthCheckService(opsSvc, execSvc, config, credentials, input, opsAwsConfig);
  }

  constructor(
    private opsService: OpsService,
    private executeService: ExecuteService,
    private config: IAwsConfig,
    private creds: IAwsCredentials,
    private input: IExecuteInput,
    private opsAwsConfig: OpsDataAwsConfig
  ) {}

  private getAwsSdk<Sdk>(SdkType: new (config: any) => Sdk, config: any) {
    return new SdkType({ ...config, ...this.creds });
  }

  public async ManageHealthCheck(deploymentName: string, enable: boolean, region?: string) {
    await this.executeService.execute(
      {
        header: `${enable ? 'Enabling' : 'Disabling'} Health Check on Deployment ${deploymentName}`,
        message: `${enable ? 'Enabling' : 'Disabling'} Health Check on Deployment ${deploymentName}`,
        errorHeader: `Failed to ${enable ? 'Enable' : 'Disable'} Health Check on Deployment ${deploymentName}`,
      },
      () => this.ManageHealthcheckInternal(deploymentName, enable, region)
    );
  }

  public async ManageHealthcheckInternal(deploymentName: string, enable: boolean, region?: string) {
    const opsContext = await this.opsService.getOpsDataContext();
    const deployment = await opsContext.deploymentData.listAll(deploymentName);
    if (deployment.length > 1 && !region) {
      throw Error('Multiple deployments found, please specify the region of the deployment.');
    }

    const lbSdk = this.getAwsSdk(AWS.ELBv2, { region: region || deployment[0].region });

    const targetGroups = await lbSdk.describeTargetGroups().promise();

    const targetGroupsWithinDeployment = targetGroups.TargetGroups?.filter((tg) =>
      tg.TargetGroupName?.includes(`${deploymentName}${TG_PARTIAL_POSTFIX}`)
    ) as AWS.ELBv2.TargetGroup[];

    await Promise.all(
      targetGroupsWithinDeployment?.map((target) =>
        lbSdk
          .modifyTargetGroup({
            TargetGroupArn: target.TargetGroupArn as string,
            HealthCheckPath: enable ? '/v1/health' : '/v1/healthz',
            Matcher: {
              HttpCode: enable ? '200' : '404',
            },
          })
          .promise()
      )
    );
  }
}
