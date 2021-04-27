import { AwsCert, IAwsCertDetail, IAwsCertValidateDetail } from '@5qtrs/aws-cert';
import { AwsRegion } from '@5qtrs/aws-region';
import { DataSource } from '@5qtrs/data';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { IAwsConfig } from '@5qtrs/aws-config';

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

export class OpsCert extends DataSource {
  public static async create(provider: OpsDataAwsProvider) {
    return new OpsCert(provider);
  }

  private provider: OpsDataAwsProvider;

  private constructor(provider: OpsDataAwsProvider) {
    super();
    this.provider = provider;
  }

  private async getRoute53(domain: string) {
    return await this.provider.getAwsRoute53FromDomain(domain);
  }

  public async issueCert(hostName: string, awsConfig?: IAwsConfig): Promise<IAwsCertDetail> {
    const config = awsConfig || (await this.provider.getAwsConfigForMain());
    const awsCert = await AwsCert.create(config);
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
    const validatingRecords: any = {};
    await Promise.all(
      certDetails.validations.map((validation) => {
        if (!validatingRecords[validation.record.name]) {
          validatingRecords[validation.record.name] = true;
          return this.createRecordForValidation(validation);
        }
      })
    );
  }

  private async deleteRecords(certDetails: IAwsCertDetail): Promise<void> {
    const validatingRecords: any = {};
    await Promise.all(
      certDetails.validations.map((validation) => {
        if (!validatingRecords[validation.record.name]) {
          validatingRecords[validation.record.name] = true;
          return this.deleteRecordForValidation(validation);
        }
      })
    );
  }
}
