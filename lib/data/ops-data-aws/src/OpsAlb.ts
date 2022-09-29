import { IAwsCertDetail } from '@5qtrs/aws-cert';
import { DataSource } from '@5qtrs/data';
import { IOpsDeployment } from '@5qtrs/ops-data';
import { OpsCert } from './OpsCert';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataTables } from './OpsDataTables';
import { OpsNetworkData } from './OpsNetworkData';

// ----------------
// Exported Classes
// ----------------

export class OpsAlb extends DataSource {
  public static async create(
    config: OpsDataAwsConfig,
    provider: OpsDataAwsProvider,
    tables: OpsDataTables,
    globalProvider?: OpsDataAwsProvider
  ) {
    const networkData = await OpsNetworkData.create(config, provider, tables);
    return new OpsAlb(config, provider, networkData, globalProvider);
  }

  private config: OpsDataAwsConfig;
  private provider: OpsDataAwsProvider;
  private networkData: OpsNetworkData;
  private globalProvider?: OpsDataAwsProvider;

  private constructor(
    config: OpsDataAwsConfig,
    provider: OpsDataAwsProvider,
    networkData: OpsNetworkData,
    globalProvider?: OpsDataAwsProvider
  ) {
    super();
    this.config = config;
    this.provider = provider;
    this.networkData = networkData;
    this.globalProvider = globalProvider;
  }

  private async getRoute53(domain: string) {
    // In GovCloud deployments, we use Route53 from the global AWS account, not the GovCloud account
    return this.globalProvider
      ? await this.globalProvider.getAwsRoute53FromMainAccount()
      : await this.provider.getAwsRoute53FromDomain(domain);
  }

  public async addAlb(deployment: IOpsDeployment): Promise<void> {
    const awsAlb = await this.provider.getAwsAlb(deployment.deploymentName, deployment.region);
    const awsWaf = await this.provider.getAwsWaf(deployment.deploymentName, deployment.region);
    const network = await this.networkData.get(deployment.networkName, deployment.region);
    const hostName = this.getHostName(network.region, deployment);

    const certDetails = await this.issueCert(deployment, hostName);
    const options = {
      name: this.config.monoAlbDeploymentName,
      certArns: [certDetails.arn],
      vpcId: network.vpcId,
      subnets: network.publicSubnets.map((subnet) => subnet.id),
      securityGroups: [network.securityGroupId],
      defaultTarget: {
        name: this.config.monoAlbDefaultTargetName,
        port: this.config.monoAlbApiPort,
        healthCheck: { path: this.config.monoAlbHealthCheckPath },
      },
    };

    const alb = await awsAlb.ensureAlb(options);
    const waf = await awsWaf.ensureWaf({ name: deployment.deploymentName, lbArn: alb.arn });
    const route53 = await this.getRoute53(deployment.domainName);
    await route53.ensureRecord(deployment.domainName, { name: hostName, alias: alb.dns, type: 'A' });
  }

  public async addTargetGroup(deployment: IOpsDeployment, id: number, healthCheckDisabled?: boolean): Promise<string> {
    const awsAlb = await this.provider.getAwsAlb(deployment.deploymentName, deployment.region);
    const route53 = await this.getRoute53(deployment.domainName);
    const network = await this.networkData.get(deployment.networkName, deployment.region);

    const targetGroupName = this.getTargetGroupName(id);
    const hostName = this.getHostName(network.region, deployment, id);
    const targetGroup = {
      name: targetGroupName,
      host: hostName,
      port: this.config.monoAlbApiPort,
      healthCheck: { path: this.config.monoAlbHealthCheckPath, successCodes: ['200'] },
    };

    if (healthCheckDisabled) {
      targetGroup.healthCheck.path = this.config.monoAlbHealthCheckDisabledPath;
      targetGroup.healthCheck.successCodes = ['404'];
    }
    const alb = await awsAlb.getAlb(this.config.monoAlbDeploymentName);
    await route53.ensureRecord(deployment.domainName, { name: hostName, alias: alb.dns, type: 'A' });

    return awsAlb.addTarget(this.config.monoAlbDeploymentName, targetGroup);
  }

  public async getTargetGroupArn(deployment: IOpsDeployment, id?: number): Promise<string> {
    const awsAlb = await this.provider.getAwsAlb(deployment.deploymentName, deployment.region);
    const alb = await awsAlb.getAlb(this.config.monoAlbDeploymentName);
    const targetGroupName = this.getTargetGroupName(id);
    return alb.targets[targetGroupName];
  }

  public async removeTargetGroup(deployment: IOpsDeployment, id: number): Promise<void> {
    const awsAlb = await this.provider.getAwsAlb(deployment.deploymentName, deployment.region);
    const route53 = await this.getRoute53(deployment.domainName);
    const network = await this.networkData.get(deployment.networkName, deployment.region);

    const targetGroupName = this.getTargetGroupName(id);
    const hostName = this.getHostName(network.region, deployment, id);

    const alb = await awsAlb.getAlb(this.config.monoAlbDeploymentName);
    await route53.deleteRecord(deployment.domainName, { name: hostName, alias: alb.dns, type: 'A' });

    await awsAlb.removeTarget(this.config.monoAlbDeploymentName, targetGroupName);
  }

  private getHostName(region: string, deployment: IOpsDeployment, id?: number): string {
    let hostname = `${deployment.deploymentName}.${region}.${deployment.domainName}`;
    if (id !== undefined) {
      const targetGroupName = this.getTargetGroupName(id);
      hostname = `${targetGroupName}.${hostname}`;
    }
    return hostname;
  }

  private getTargetGroupName(id?: number): string {
    return id === undefined
      ? `${this.config.monoAlbDefaultTargetName}`
      : `${this.config.monoAlbTargetNamePrefix}-${id}`;
  }

  private async issueCert(deployment: IOpsDeployment, hostName: string): Promise<IAwsCertDetail> {
    const opsCert = await OpsCert.create(this.globalProvider || this.provider);
    const awsConfig = await this.provider.getAwsConfigForDeployment(deployment.deploymentName, deployment.region);
    const certDetails = await opsCert.issueCert(hostName, awsConfig);

    return certDetails;
  }
}
