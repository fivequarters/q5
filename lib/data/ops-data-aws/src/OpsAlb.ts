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

  public async addAlb(deployment: IOpsDeployment) {
    const alb = await this.provider.getAwsAlb(deployment.deploymentName);
    const certDetails = await this.issueCert(deployment);
    const network = await this.networkData.get(deployment.networkName);

    const options = {
      certArns: [certDetails.arn],
      subnets: network.publicSubnets.map(subnet => subnet.id),
      securityGroups: [network.securityGroupId],
    };

    await alb.ensureAlb(options);
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
