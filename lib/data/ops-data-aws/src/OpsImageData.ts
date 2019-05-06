import { DataSource } from '@5qtrs/data';
import { IOpsImageData } from '@5qtrs/ops-data';
import { AwsEcr } from '@5qtrs/aws-ecr';
import { AwsEc2 } from '@5qtrs/aws-ec2';
import { OpsDeploymentData } from './OpsDeploymentData';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class OpsImageData extends DataSource implements IOpsImageData {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider) {
    const awsConfig = await provider.getAwsConfigForMain();
    const networkData = await OpsNetworkData.create(config, provider);
    const deploymentData = await OpsDeploymentData.create(config, provider);
    const awsEcr = await AwsEcr.create(awsConfig);
    return new OpsImageData(config, provider, networkData, deploymentData, awsEcr);
  }

  private config: OpsDataAwsConfig;
  private provider: OpsDataAwsProvider;
  private networkData: OpsNetworkData;
  private deploymentData: OpsDeploymentData;
  private awsEcr: AwsEcr;

  private constructor(
    config: OpsDataAwsConfig,
    provider: OpsDataAwsProvider,
    networkData: OpsNetworkData,
    deploymentData: OpsDeploymentData,
    awsEcr: AwsEcr
  ) {
    super();
    this.config = config;
    this.awsEcr = awsEcr;
    this.provider = provider;
    this.networkData = networkData;
    this.deploymentData = deploymentData;
  }

  public async isSetup(): Promise<boolean> {
    return this.awsEcr.repositoryExists(this.config.monoRepoName);
  }

  public async setup(): Promise<void> {
    await this.awsEcr.createRepository(this.config.monoRepoName);
  }

  public async publish(tag: string): Promise<void> {
    return this.awsEcr.pushImage(this.config.monoRepoName, tag);
  }

  public async deploy(deploymentName: string, tag: string): Promise<void> {
    const deployment = await this.deploymentData.get(deploymentName);
    const network = await this.networkData.get(deployment.networkName);
    const awsConfig = await this.provider.getAwsConfig(network.accountName, network.region);
    const ec2 = await AwsEc2.create(awsConfig);

    const launch = {
      deploymentName: deploymentName,
      subnetId: network.privateSubnets[0].id,
      securityGroupId: network.securityGroupId,
      instanceType: this.config.monoInstanceType,
      apiPort: this.config.monoApiPort.toString(),
      logPort: this.config.monoAlbLogPort.toString(),
      albApiPort: this.config.monoAlbApiPort.toString(),
      albLogPort: this.config.monoAlbLogPort.toString(),
      role: 'arn:aws:iam::321612923577:instance-profile/Flexd-EC2-Instance',
      image: {
        tag,
        repository: this.config.monoRepoName,
        account: this.config.mainAccountId,
        region: this.config.mainRegion,
      },
    };

    await ec2.launchInstance(launch);
  }
}
