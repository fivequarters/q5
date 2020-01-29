import { DataSource } from '@5qtrs/data';
import { AwsRegion } from '@5qtrs/aws-region';
import { AwsCert, IAwsCertDetail, IAwsCertValidateDetail } from '@5qtrs/aws-cert';
import { IOpsDeployment } from '@5qtrs/ops-data';
import { OpsDataTables } from './OpsDataTables';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ------------------
// Internal Functions
// ------------------

function getParentDomain(domain: string) {
  // domain may start with a wildcard segment
  const segments = domain.split('.');
  if (segments[0] === '*') {
    segments.shift();
  }

  // next segment will be the deployment name
  segments.shift();

  // next segment is possible a region
  if (AwsRegion.isRegion(segments[0])) {
    segments.shift();
  }

  // remaining segments are the parent domain
  return segments.join('.');
}

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
    const network = await this.networkData.get(deployment.networkName, deployment.region);
    const hostName = this.getHostName(network.region, deployment);

    const certDetails = await this.issueCert(deployment, hostName);
    const options = {
      name: this.config.monoAlbDeploymentName,
      certArns: [certDetails.arn],
      vpcId: network.vpcId,
      subnets: network.publicSubnets.map(subnet => subnet.id),
      securityGroups: [network.securityGroupId],
      defaultTarget: {
        name: this.config.monoAlbDefaultTargetName,
        port: this.config.monoAlbApiPort,
        healthCheck: { path: this.config.monoAlbHealthCheckPath },
      },
    };

    const alb = await awsAlb.ensureAlb(options);

    const route53 = await this.getRoute53(deployment.domainName);
    await route53.ensureRecord(deployment.domainName, { name: hostName, alias: alb.dns, type: 'A' });
  }

  public async addTargetGroup(deployment: IOpsDeployment, id: number): Promise<string> {
    const awsAlb = await this.provider.getAwsAlb(deployment.deploymentName, deployment.region);
    const route53 = await this.getRoute53(deployment.domainName);
    const network = await this.networkData.get(deployment.networkName, deployment.region);

    const targetGroupName = this.getTargetGroupName(id);
    const hostName = this.getHostName(network.region, deployment, id);
    const targetGroup = {
      name: targetGroupName,
      host: hostName,
      port: this.config.monoAlbApiPort,
      healthCheck: { path: this.config.monoAlbHealthCheckPath },
    };

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
    const awsConfig = await this.provider.getAwsConfigForDeployment(deployment.deploymentName, deployment.region);
    const awsCert = await AwsCert.create(awsConfig);
    const alternateDomains = [`*.${hostName}`];
    const certDetails = await awsCert.issueCert(hostName, { alternateDomains });

    if (certDetails.status === 'ISSUED') {
      return certDetails;
    }

    if (certDetails.status !== 'PENDING_VALIDATION') {
      const message = `Certificate is not pending validation, but has '${certDetails.status}' status.`;
      throw new Error(message);
    }

    for (const validation of certDetails.validations) {
      if (validation.status === 'FAILED') {
        const message = `Certificate record '${validation.domain}' validation has 'FAILED' status.`;
        throw new Error(message);
      }
    }

    await this.createRecords(certDetails);
    await awsCert.waitForCert(certDetails.arn);
    await this.deleteRecords(certDetails);
    return certDetails;
  }

  private async createRecordForValidation(validation: IAwsCertValidateDetail): Promise<void> {
    if (validation.status === 'PENDING_VALIDATION') {
      const validationDomain = validation.domain;
      const parentDomain = getParentDomain(validationDomain);
      const route53 = await this.getRoute53(parentDomain);

      return route53.ensureRecord(parentDomain, {
        name: validation.record.name,
        type: 'CNAME',
        values: validation.record.value,
      });
    }
  }

  private async deleteRecordForValidation(validation: IAwsCertValidateDetail): Promise<void> {
    const validationDomain = validation.domain;
    const parentDomain = getParentDomain(validationDomain);
    const route53 = await this.getRoute53(parentDomain);

    return route53.deleteRecord(parentDomain, {
      name: validation.record.name,
      type: 'CNAME',
      values: validation.record.value,
    });
  }

  private async createRecords(certDetails: IAwsCertDetail): Promise<void> {
    const promises = [];
    const validatingRecords: any = {};
    for (const validation of certDetails.validations) {
      if (!validatingRecords[validation.record.name]) {
        validatingRecords[validation.record.name] = true;
        promises.push(this.createRecordForValidation(validation));
      }
    }
    await Promise.all(promises);
  }

  private async deleteRecords(certDetails: IAwsCertDetail): Promise<void> {
    const promises = [];
    const validatingRecords: any = {};
    for (const validation of certDetails.validations) {
      if (!validatingRecords[validation.record.name]) {
        validatingRecords[validation.record.name] = true;
        promises.push(this.deleteRecordForValidation(validation));
      }
    }
    await Promise.all(promises);
  }
}
