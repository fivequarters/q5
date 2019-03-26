import { AwsBase, IAwsOptions } from '@5qtrs/aws-base';
import { Route53 } from 'aws-sdk';
import { ensureArray } from '@5qtrs/type';
import { sameItems } from '@5qtrs/array';

// ------------------
// Internal Functions
// ------------------

function normalizeDomain(domain: string) {
  return domain[domain.length - 1] === '.' ? domain : `${domain}.`;
}

// -------------------
// Internal Interfaces
// -------------------

interface IHostedZoneRecordDetail {
  name: string;
  type: string;
  setId?: string;
  ttl: number;
  values: string[];
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
  values: string | string[];
}

// ----------------
// Exported Classes
// ----------------

export class AwsRoute53 extends AwsBase<typeof Route53> {
  public static async create(options: IAwsOptions) {
    return new AwsRoute53(options);
  }
  private constructor(options: IAwsOptions) {
    super(options);
  }

  protected onGetAws(options: any) {
    return new Route53(options);
  }

  public async getRecords(domain: string, type?: string): Promise<IHostedZoneRecordDetail[]> {
    const id = await this.getHostedZoneId(domain);
    if (id === undefined) {
      return [];
    }

    const records = await this.getHostedZoneRecords(id);
    return type === undefined ? records : records.filter(record => record.type === type);
  }

  public async ensureRecord(domain: string, record: IHostedZoneRecord): Promise<void> {
    const hostedZone = await this.ensureHostedZone(domain);
    const records = await this.getHostedZoneRecords(hostedZone.id);
    const name = normalizeDomain(record.name);
    const values = ensureArray(record.values);
    for (const existing of records) {
      if (existing.name === name && existing.type === record.type && sameItems(values, existing.values)) {
        return;
      }
    }

    await this.createHostedZoneRecord(hostedZone.id, record);
  }

  public async deleteRecord(domain: string, record: IHostedZoneRecord): Promise<void> {
    let id = await this.getHostedZoneId(domain);
    if (!id) {
      return;
    }

    const records = await this.getHostedZoneRecords(id);
    const name = normalizeDomain(record.name);
    const values = ensureArray(record.values);
    for (const existing of records) {
      if (existing.name === name && existing.type === record.type && sameItems(values, existing.values)) {
        await this.deleteHostedZoneRecord(id, existing);
      }
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
          reject(error);
        }

        resolve({ domain, id: data.HostedZone.Id });
      });
    });
  }

  private async createHostedZoneRecord(id: string, record: IHostedZoneRecord): Promise<void> {
    const route53 = await this.getAws();
    const params: any = {
      ChangeBatch: {
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: record.name,
              ResourceRecords: ensureArray(record.values).map(value => ({ Value: value })),
              Type: record.type,
              TTL: 60,
            },
          },
        ],
      },
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

  private async deleteHostedZoneRecord(id: string, record: IHostedZoneRecordDetail): Promise<void> {
    const route53 = await this.getAws();
    const params: any = {
      ChangeBatch: {
        Changes: [
          {
            Action: 'DELETE',
            ResourceRecordSet: {
              Name: record.name,
              ResourceRecords: ensureArray(record.values).map(value => ({ Value: value })),
              Type: record.type,
              TTL: record.ttl,
            },
          },
        ],
      },
      HostedZoneId: id,
    };

    return new Promise((resolve, reject) => {
      route53.changeResourceRecordSets(params, (error: any, data: any) => {
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
              for (const value of record.ResourceRecords) {
                values.push(value.Value);
              }
              results.push({
                name: record.Name,
                type: record.Type,
                setId: record.SetIdentifier,
                ttl: record.TTL,
                values,
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
            reject(error);
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
