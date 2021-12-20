import { IAwsConfig } from '@5qtrs/aws-config';
import { AwsCreds, IAwsCredentials } from '@5qtrs/aws-cred';
import { IExecuteInput } from '@5qtrs/cli';
import AWS from 'aws-sdk';
import { ExecuteService } from '.';
import { OpsService } from './OpsService';

const DISCOVERY_DOMAIN_NAME = 'fusebit.local';

export class MonitoringService {
  public static async create(input: IExecuteInput) {
    const opsSvc = await OpsService.create(input);
    const execSvc = await ExecuteService.create(input);
    const opsDataContext = await opsSvc.getOpsDataContextImpl();
    const config = await opsDataContext.provider.getAwsConfigForMain();
    const credentials = await (config.creds as AwsCreds).getCredentials();
    return new MonitoringService(opsSvc, execSvc, config, credentials, input);
  }

  constructor(
    private opsService: OpsService,
    private executeService: ExecuteService,
    private config: IAwsConfig,
    private creds: IAwsCredentials,
    private input: IExecuteInput
  ) {}

  private async getCloudMapSdk(config: any) {
    return new AWS.ServiceDiscovery({
      ...config,
      accessKeyId: this.creds.accessKeyId as string,
      secretAccessKey: this.creds.secretAccessKey as string,
      sessionToken: this.creds.sessionToken as string,
    });
  }

  private async ensureCloudMap(region: string, vpcId: string, deploymentName: string) {
    const mapSdk = await this.getCloudMapSdk({ region });
    const zones = await mapSdk.listNamespaces().promise();
    for (const zone of zones.Namespaces as AWS.ServiceDiscovery.NamespaceSummariesList) {
      if (zone.Description === deploymentName) {
        return;
      }
    }

    await mapSdk
      .createPrivateDnsNamespace({
        Description: deploymentName,
        Name: 'fusebit.local',
        Vpc: vpcId,
      })
      .promise();
  }

  private async ensureRegionOrError(deploymentName?: string, region?: string) {
    if (region) {
      return region;
    }

    if (deploymentName) {
      const reg = await this.getDeploymentDetails();

      if (reg) {
        return reg;
      }
    }

    throw Error('Deployment region not found.');
  }

  private async getDeploymentDetails(deploymentName: string) {
    const opsData = await this.opsService.getOpsDataContext({
      deploymentName: deploymentName,
    });
    const deployments = await opsData.deploymentData.listAll(deploymentName);
    return deployments.length === 1 ? deployments[0] : undefined;
  }

  private async getNetworkDetails(deploymentName: string) {
    const deploymentDetails = await this.getDeploymentDetails(deploymentName);
    if (!deploymentDetails) {
      throw Error('Deployment not found!');
    }
    const opsData = await this.opsService.getOpsDataContext({ deploymentName });
    const networks = await opsData.networkData.get(deploymentDetails.networkName, deploymentDetails.region);
    return networks;
  }
}
