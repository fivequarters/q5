import { DataSource } from '@5qtrs/data';
import {
  IOpsDomainData,
  IOpsDomain,
  IListOpsDomainOptions,
  IListOpsDomainResult,
  OpsDataException,
  OpsDataExceptionCode,
} from '@5qtrs/ops-data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AwsRoute53 } from '@5qtrs/aws-route53';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { DomainTable } from './tables/DomainTable';

// ------------------
// Internal Constants
// ------------------

const defaultRegion = 'us-east-2';
const nameServerRecord = 'NS';
const invalidDomainNameCode = 'InvalidDomainName';

// ----------------
// Exported Classes
// ----------------

export class OpsDomainData extends DataSource implements IOpsDomainData {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider) {
    const awsConfig = await provider.getAwsConfigForMain();
    const dynamo = await AwsDynamo.create(awsConfig);
    const domainTable = await DomainTable.create(config, dynamo);
    return new OpsDomainData(domainTable, provider);
  }
  private domainTable: DomainTable;
  private provider: OpsDataAwsProvider;

  private constructor(domainTable: DomainTable, provider: OpsDataAwsProvider) {
    super([domainTable]);
    this.domainTable = domainTable;
    this.provider = provider;
  }

  public async exists(domain: IOpsDomain): Promise<boolean> {
    try {
      const existing = await this.domainTable.get(domain.domainName);
      if (existing.accountName !== domain.accountName) {
        throw OpsDataException.domainDifferentAccount(domain.domainName, existing.accountName);
      }
      await this.ensureHostedZone(domain);
      return true;
    } catch (error) {
      if (error.code === OpsDataExceptionCode.noDomain) {
        return false;
      }
      throw error;
    }
  }

  public async add(domain: IOpsDomain): Promise<IOpsDomain> {
    await this.domainTable.add(domain);
    await this.ensureHostedZone(domain);
    return this.attachNameServers(domain);
  }

  public async get(domainName: string): Promise<IOpsDomain> {
    const domain = await this.domainTable.get(domainName);
    return this.attachNameServers(domain);
  }

  public async list(options?: IListOpsDomainOptions): Promise<IListOpsDomainResult> {
    const result = await this.domainTable.list(options);
    const items = await Promise.all(result.items.map((domain: IOpsDomain) => this.attachNameServers(domain)));
    return {
      next: result.next,
      items,
    };
  }

  public async listAll(): Promise<IOpsDomain[]> {
    const domains = await this.domainTable.listAll();
    return Promise.all(domains.map((domain: IOpsDomain) => this.attachNameServers(domain)));
  }

  private async getRoute53(domain: IOpsDomain): Promise<AwsRoute53> {
    const awsConfig = await this.provider.getAwsConfig(domain.accountName, defaultRegion);
    return AwsRoute53.create(awsConfig);
  }

  private async ensureHostedZone(domain: IOpsDomain): Promise<void> {
    const route53 = await this.getRoute53(domain);

    try {
      await route53.ensureHostedZone(domain.domainName);
    } catch (error) {
      await this.domainTable.delete(domain.domainName);
      if (error.code === invalidDomainNameCode) {
        throw OpsDataException.invalidDomainName(domain.domainName);
      }
      throw error;
    }
  }

  private async attachNameServers(domain: IOpsDomain): Promise<IOpsDomain> {
    const route53 = await this.getRoute53(domain);
    const records = await route53.getRecords(domain.domainName, nameServerRecord);

    domain.nameServers = [];
    if (records !== undefined) {
      for (const record of records) {
        domain.nameServers.push(...record.values);
      }
    }

    return domain;
  }
}
