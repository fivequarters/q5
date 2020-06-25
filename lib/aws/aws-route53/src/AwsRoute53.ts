import { same } from '@5qtrs/array';
import { AwsBase, IAwsConfig } from '@5qtrs/aws-base';
import { ensureArray } from '@5qtrs/type';
import { Route53 } from 'aws-sdk';

// ------------------
// Internal Functions
// ------------------

function normalizeDomain(domain: string) {
  return domain[domain.length - 1] === '.' ? domain : `${domain}.`;
}

function getMatchingDetail(
  record: IHostedZoneRecord,
  details: IHostedZoneRecordDetail[]
): IHostedZoneRecordDetail | undefined {
  const name = normalizeDomain(record.name);
  const aliasName = record.alias ? normalizeDomain(record.alias.name) : undefined;
  const values = record.values ? ensureArray(record.values) : undefined;

  for (const detail of details) {
    if (detail.name === name && detail.type === record.type) {
      if (
        record.alias &&
        detail.alias &&
        detail.alias.hostedZone === record.alias.hostedZone &&
        detail.alias.name === aliasName
      ) {
        return detail;
      } else if (values && detail.values && same(values, detail.values)) {
        return detail;
      }
    }
  }

  return undefined;
}

// -------------------
// Internal Interfaces
// -------------------

interface IHostedZoneRecordDetail {
  name: string;
  type: string;
  setId?: string;
  ttl: number;
  values?: string[];
  alias?: {
    name: string;
    hostedZone: string;
  };
}

interface IHostedZoneDetail {
  id: string;
  domain: string;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IHostedZoneRecord {
  name: string;
  type: string;
  values?: string | string[];
  alias?: {
    name: string;
    hostedZone: string;
  };
}

// ----------------
// Exported Classes
// ----------------

export class AwsRoute53 extends AwsBase<typeof Route53> {
  public static async create(config: IAwsConfig) {
    return new AwsRoute53(config);
  }
  private constructor(config: IAwsConfig) {
    super(config);
  }

  public async getRecords(domain: string, type?: string): Promise<IHostedZoneRecordDetail[]> {
    const id = await this.getHostedZoneId(domain);
    if (id === undefined) {
      return [];
    }

    const records = await this.getHostedZoneRecords(id);
    return type === undefined ? records : records.filter((record) => record.type === type);
  }

  public async ensureRecord(domain: string, record: IHostedZoneRecord): Promise<void> {
    const hostedZone = await this.ensureHostedZone(domain);
    const details = await this.getHostedZoneRecords(hostedZone.id);
    const match = getMatchingDetail(record, details);
    if (match) {
      return;
    }

    await this.changeHostedZoneRecord(hostedZone.id, 'UPSERT', record);
  }

  public async deleteRecord(domain: string, record: IHostedZoneRecord): Promise<void> {
    const id = await this.getHostedZoneId(domain);
    if (!id) {
      return;
    }

    const details = await this.getHostedZoneRecords(id);
    const match = getMatchingDetail(record, details);
    if (match) {
      await this.changeHostedZoneRecord(id, 'DELETE', match);
    }
  }

  public async hostedZoneExists(domain: string): Promise<boolean> {
    const id = await this.getHostedZoneId(domain);
    return id !== undefined;
  }

  public async ensureHostedZone(domain: string): Promise<IHostedZoneDetail> {
    const id = await this.getHostedZoneId(domain);
    return id !== undefined ? { domain, id } : this.createHostedZone(domain);
  }

  public async createHostedZone(domain: string): Promise<IHostedZoneDetail> {
    const route53 = await this.getAws();
    const params = {
      CallerReference: Date.now().toString(),
      Name: domain,
    };

    return new Promise((resolve, reject) => {
      route53.createHostedZone(params, (error: any, data: any) => {
        if (error) {
          return reject(error);
        }
        resolve({ domain, id: data.HostedZone.Id });
      });
    });
  }

  protected onGetAws(config: IAwsConfig) {
    // AWS GovCloud Route53 endpoint is custom, see https://github.com/aws/aws-cli/issues/4241
    const endpoint = this.config.govCloud ? 'https://route53.us-gov.amazonaws.com' : undefined;
    return new Route53({ ...config, endpoint });
  }

  private async changeHostedZoneRecord(id: string, action: string, record: IHostedZoneRecord): Promise<void> {
    const route53 = await this.getAws();

    const resourceRecords = record.values ? ensureArray(record.values).map((value) => ({ Value: value })) : undefined;

    const aliasTarget = record.alias
      ? {
          DNSName: record.alias.name,
          EvaluateTargetHealth: false,
          HostedZoneId: record.alias.hostedZone,
        }
      : undefined;

    const resourceRecordSet: any = { Name: record.name, Type: record.type };
    if (aliasTarget) {
      resourceRecordSet.AliasTarget = aliasTarget;
    } else if (resourceRecords) {
      resourceRecordSet.ResourceRecords = resourceRecords;
      resourceRecordSet.TTL = 60;
    }

    const params = {
      ChangeBatch: { Changes: [{ Action: action, ResourceRecordSet: resourceRecordSet }] },
      HostedZoneId: id,
    };

    return new Promise((resolve, reject) => {
      route53.changeResourceRecordSets(params, (error: any) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });
  }

  private async getHostedZoneRecords(id: string): Promise<IHostedZoneRecordDetail[]> {
    const route53 = await this.getAws();
    const params: any = {
      HostedZoneId: id,
    };

    return new Promise((resolve, reject) => {
      const results: IHostedZoneRecordDetail[] = [];
      const func = () => {
        route53.listResourceRecordSets(params, (error: any, data: any) => {
          if (error) {
            reject(error);
          }

          if (data.ResourceRecordSets) {
            for (const record of data.ResourceRecordSets) {
              const values = [];
              if (record.ResourceRecords) {
                for (const value of record.ResourceRecords) {
                  values.push(value.Value);
                }
              }

              let alias = undefined;
              if (record.AliasTarget) {
                alias = {
                  name: record.AliasTarget.DNSName,
                  hostedZone: record.AliasTarget.HostedZoneId,
                };
              }

              results.push({
                name: record.Name,
                type: record.Type,
                setId: record.SetIdentifier,
                ttl: record.TTL,
                values: values.length ? values : undefined,
                alias,
              });
            }
          }

          if (data.IsTruncated) {
            params.StartRecordName = data.NextRecordName;
            params.StartRecordType = data.NextRecordType;
            params.StartRecordIdentifier = data.NextRecordIdentifier;
            return func();
          }

          resolve(results);
        });
      };

      func();
    });
  }

  private async getHostedZoneId(domain: string): Promise<string | undefined> {
    domain = normalizeDomain(domain);
    const hostedZones = await this.listHostedZones();
    for (const hostedZone of hostedZones) {
      if (hostedZone.domain === domain) {
        return hostedZone.id;
      }
    }
    return undefined;
  }

  private async listHostedZones(): Promise<IHostedZoneDetail[]> {
    const route53 = await this.getAws();
    const params: any = {};

    return new Promise((resolve, reject) => {
      const results: IHostedZoneDetail[] = [];
      const func = () => {
        route53.listHostedZones(params, (error: any, data: any) => {
          if (error) {
            return reject(error);
          }

          if (data.HostedZones) {
            for (const hostedZone of data.HostedZones) {
              results.push({
                id: hostedZone.Id,
                domain: hostedZone.Name,
              });
            }
          }
          if (data.NextMarker) {
            params.NextMarker = data.NextMarker;
            return func();
          }

          resolve(results);
        });
      };

      func();
    });
  }
}
