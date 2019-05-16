import { DataSource } from '@5qtrs/data';
import { AwsCert, IAwsCertDetail, IAwsCertValidateDetail } from '@5qtrs/aws-cert';
import { IOpsDeployment } from '@5qtrs/ops-data';
import { OpsDataTables } from './OpsDataTables';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ------------------
// Internal Functions
// ------------------

function getHostedAt(deployment: IOpsDeployment) {
  return `${deployment.deploymentName}.${deployment.domainName}`;
}

function getHostedAtWildcard(deployment: IOpsDeployment) {
  return `*.${deployment.deploymentName}.${deployment.domainName}`;
}

function getParentDomain(domain: string) {
  let normalized = domain.indexOf('*.') === 0 ? domain.replace('*.', '') : domain;
  const indexOfDot = normalized.indexOf('.');
  return normalized.substring(indexOfDot + 1);
}

// ----------------
// Exported Classes
// ----------------

export class OpsAlb extends DataSource {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider, tables: OpsDataTables) {
    const networkData = await OpsNetworkData.create(config, provider, tables);
    return new OpsAlb(config, provider, networkData);
  }

  private config: OpsDataAwsConfig;
  private provider: OpsDataAwsProvider;
  private networkData: OpsNetworkData;

  private constructor(config: OpsDataAwsConfig, provider: OpsDataAwsProvider, networkData: OpsNetworkData) {
    super();
    this.config = config;
    this.provider = provider;
    this.networkData = networkData;
  }

  public async addAlb(deployment: IOpsDeployment): Promise<void> {
    const awsAlb = await this.provider.getAwsAlb(deployment.deploymentName);
    const certDetails = await this.issueCert(deployment);
    const network = await this.networkData.get(deployment.networkName);

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

    const route53 = await this.provider.getAwsRoute53FromDomain(deployment.domainName);
    await route53.ensureRecord(deployment.domainName, {
      name: `${deployment.deploymentName}.${deployment.domainName}`,
      alias: alb.dns,
      type: 'A',
    });
  }

  public async addTargetGroup(deployment: IOpsDeployment, id: number): Promise<string> {
    const awsAlb = await this.provider.getAwsAlb(deployment.deploymentName);
    const route53 = await this.provider.getAwsRoute53FromDomain(deployment.domainName);

    const targetGroupName = this.getTargetGroupName(id);
    const hostName = this.getHostName(deployment, id);
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
    const awsAlb = await this.provider.getAwsAlb(deployment.deploymentName);
    const alb = await awsAlb.getAlb(this.config.monoAlbDeploymentName);
    const targetGroupName = this.getTargetGroupName(id);
    return alb.targets[targetGroupName];
  }

  public async removeTargetGroup(deployment: IOpsDeployment, id: number): Promise<void> {
    const awsAlb = await this.provider.getAwsAlb(deployment.deploymentName);
    const route53 = await this.provider.getAwsRoute53FromDomain(deployment.domainName);

    const targetGroupName = this.getTargetGroupName(id);
    const hostName = this.getHostName(deployment, id);

    const alb = await awsAlb.getAlb(this.config.monoAlbDeploymentName);
    await route53.deleteRecord(deployment.domainName, { name: hostName, alias: alb.dns, type: 'A' });

    await awsAlb.removeTarget(this.config.monoAlbDeploymentName, targetGroupName);
  }

  private getHostName(deployment: IOpsDeployment, id: number): string {
    const targetGroupName = this.getTargetGroupName(id);
    return `${targetGroupName}.${deployment.deploymentName}.${deployment.domainName}`;
  }

  private getTargetGroupName(id?: number): string {
    return id === undefined
      ? `${this.config.monoAlbDefaultTargetName}`
      : `${this.config.monoAlbTargetNamePrefix}-${id}`;
  }

  private async issueCert(deployment: IOpsDeployment): Promise<IAwsCertDetail> {
    const awsConfig = await this.provider.getAwsConfigForDeployment(deployment.deploymentName);
    const awsCert = await AwsCert.create(awsConfig);
    const hostDomain = getHostedAt(deployment);
    const alternateDomains = [getHostedAtWildcard(deployment)];
    const certDetails = await awsCert.issueCert(hostDomain, { alternateDomains });

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
      const route53 = await this.provider.getAwsRoute53FromDomain(parentDomain);

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
    const route53 = await this.provider.getAwsRoute53FromDomain(parentDomain);

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
