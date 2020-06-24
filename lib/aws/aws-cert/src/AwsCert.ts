import { same } from '@5qtrs/array';
import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { ACM } from 'aws-sdk';

// ------------------
// Internal Constants
// ------------------

const getCertDelayInMs = 500;
const defaultName = 'cert';

// ------------------
// Internal Functions
// ------------------

function mapTags(tags: { [index: string]: string }) {
  const mapped = [];
  for (const key in tags) {
    if (key) {
      mapped.push({ Key: key, Value: tags[key] });
    }
  }
  return mapped;
}

// -------------------
// Internal Interfaces
// -------------------

interface IAwsCertShort {
  arn: string;
  domain: string;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAwsCertOptions {
  name?: string;
  alternateDomains?: string[];
}

export interface IAwsCertDetail {
  arn: string;
  domain: string;
  status: string;
  alternateDomains: string[];
  validations: IAwsCertValidateDetail[];
}

export interface IAwsCertValidateDetail {
  domain: string;
  status: string;
  record: {
    name: string;
    value: string;
  };
}

// ----------------
// Exported Classes
// ----------------

export class AwsCert extends AwsBase<typeof ACM> {
  public static async create(config: IAwsConfig) {
    return new AwsCert(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  public async issueCert(domain: string, options?: IAwsCertOptions): Promise<IAwsCertDetail> {
    let cert = await this.getMatchingCert(domain, options);
    if (cert) {
      return cert;
    }

    const arn = await this.requestCert(domain, options);
    while (!cert || !cert.validations || !cert.validations.length) {
      cert = await this.getCert(arn);
      if (!cert) {
        const message = `Failed to issue certificate for the '${domain}' domain`;
        throw new Error(message);
      }

      await new Promise((resolve) => setTimeout(resolve, getCertDelayInMs));
    }

    const fullName = this.getFullName(options && options.name ? options.name : defaultName);
    await this.addTagsToCertificate(cert.arn, { Name: fullName });
    return cert;
  }

  public async certExists(domain: string, options?: IAwsCertOptions): Promise<boolean> {
    const cert = await this.getMatchingCert(domain, options);
    return cert !== undefined;
  }

  public async waitForCert(arn: string): Promise<void> {
    const cert = await this.getAws();
    const params: any = {
      CertificateArn: arn,
    };

    return new Promise((resolve, reject) => {
      cert.waitFor('certificateValidated', params, (error: any) => {
        if (error) {
          reject(error);
        }
        resolve();
      });
    });
  }

  protected onGetAws(config: IAwsConfig) {
    return new ACM(config);
  }

  private async getMatchingCert(domain: string, options?: IAwsCertOptions): Promise<IAwsCertDetail | undefined> {
    const certsWithDomain = await this.getCertsByDomain(domain);
    const alternateDomains = options && options.alternateDomains ? options.alternateDomains.slice() : [];
    alternateDomains.push(domain);
    for (const cert of certsWithDomain) {
      if (cert.status === 'ISSUED' && same(cert.alternateDomains, alternateDomains)) {
        return cert;
      }
    }
    return undefined;
  }

  private async listCerts(): Promise<IAwsCertShort[]> {
    const cert = await this.getAws();
    const params: any = {};

    return new Promise((resolve, reject) => {
      const results: IAwsCertShort[] = [];
      const func = () => {
        cert.listCertificates(params, (error: any, data: any) => {
          if (error) {
            reject(error);
          }

          if (data.CertificateSummaryList) {
            for (const summary of data.CertificateSummaryList) {
              results.push({
                arn: summary.CertificateArn,
                domain: summary.DomainName,
              });
            }
          }
          if (data.NextToken) {
            params.NextToken = data.NextToken;
            return func();
          }

          resolve(results);
        });
      };

      func();
    });
  }

  private async getCertsByDomain(domain: string): Promise<IAwsCertDetail[]> {
    const certs = await this.listCerts();
    const fullCerts = [];
    for (const cert of certs) {
      if (cert.domain === domain) {
        const fullCert = await this.getCert(cert.arn);
        if (fullCert) {
          fullCerts.push(fullCert);
        }
      }
    }

    return fullCerts;
  }

  private async getCert(arn: string): Promise<IAwsCertDetail | undefined> {
    const cert = await this.getAws();
    const params: any = {
      CertificateArn: arn,
    };

    return new Promise((resolve, reject) => {
      cert.describeCertificate(params, (error: any, data: any) => {
        if (error) {
          reject(error);
        }

        const certificate: IAwsCertDetail = {
          arn: data.Certificate.CertificateArn,
          domain: data.Certificate.DomainName,
          status: data.Certificate.Status,
          alternateDomains: data.Certificate.SubjectAlternativeNames,
          validations: [],
        };

        if (data.Certificate.DomainValidationOptions) {
          for (const option of data.Certificate.DomainValidationOptions) {
            if (option.ResourceRecord) {
              certificate.validations.push({
                domain: option.DomainName,
                status: option.ValidationStatus,
                record: {
                  name: option.ResourceRecord.Name,
                  value: option.ResourceRecord.Value,
                },
              });
            }
          }
        }

        resolve(certificate);
      });
    });
  }

  private async requestCert(domain: string, options?: IAwsCertOptions): Promise<string> {
    const cert = await this.getAws();
    const params: any = {
      DomainName: domain,
      ValidationMethod: 'DNS',
      Options: {
        CertificateTransparencyLoggingPreference: 'ENABLED',
      },
    };

    if (options && options.alternateDomains && options.alternateDomains.length) {
      params.SubjectAlternativeNames = options.alternateDomains.slice();
    }

    return new Promise((resolve, reject) => {
      cert.requestCertificate(params, (error: any, data: any) => {
        if (error) {
          reject(error);
        }

        resolve(data.CertificateArn);
      });
    });
  }

  private async addTagsToCertificate(certificateArn: string, tags: { [index: string]: string }): Promise<string> {
    const cert = await this.getAws();
    const params: any = {
      CertificateArn: certificateArn,
      Tags: mapTags(tags),
    };

    return new Promise((resolve, reject) => {
      cert.addTagsToCertificate(params, (error: any) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });
  }
}
