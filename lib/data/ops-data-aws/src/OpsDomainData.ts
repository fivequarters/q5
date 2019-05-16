import { DataSource } from '@5qtrs/data';
import {
  IOpsDomainData,
  IOpsDomain,
  IListOpsDomainOptions,
  IListOpsDomainResult,
  OpsDataException,
  OpsDataExceptionCode,
} from '@5qtrs/ops-data';
import { OpsDataTables } from './OpsDataTables';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const nameServerRecord = 'NS';
const invalidDomainNameCode = 'InvalidDomainName';

// ----------------
// Exported Classes
// ----------------

export class OpsDomainData extends DataSource implements IOpsDomainData {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider, tables: OpsDataTables) {
    return new OpsDomainData(config, provider, tables);
  }
  private config: OpsDataAwsConfig;
  private tables: OpsDataTables;
  private provider: OpsDataAwsProvider;

  private constructor(config: OpsDataAwsConfig, provider: OpsDataAwsProvider, tables: OpsDataTables) {
    super([]);
    this.config = config;
    this.provider = provider;
    this.tables = tables;
  }

  public async exists(domain: IOpsDomain): Promise<boolean> {
    try {
      const existing = await this.tables.domainTable.get(domain.domainName);
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
    await this.tables.domainTable.add(domain);
    await this.ensureHostedZone(domain);
    return this.attachNameServers(domain);
  }

  public async get(domainName: string): Promise<IOpsDomain> {
    const domain = await this.tables.domainTable.get(domainName);
    return this.attachNameServers(domain);
  }

  public async list(options?: IListOpsDomainOptions): Promise<IListOpsDomainResult> {
    const result = await this.tables.domainTable.list(options);
    const items = await Promise.all(result.items.map((domain: IOpsDomain) => this.attachNameServers(domain)));
    return {
      next: result.next,
      items,
    };
  }

  public async listAll(): Promise<IOpsDomain[]> {
    const domains = await this.tables.domainTable.listAll();
    return Promise.all(domains.map((domain: IOpsDomain) => this.attachNameServers(domain)));
  }

  private async ensureHostedZone(domain: IOpsDomain): Promise<void> {
    const route53 = await this.provider.getAwsRoute53FromAccount(domain.accountName);

    try {
      await route53.ensureHostedZone(domain.domainName);
    } catch (error) {
      await this.tables.domainTable.delete(domain.domainName);
      if (error.code === invalidDomainNameCode) {
        throw OpsDataException.invalidDomainName(domain.domainName);
      }
      throw error;
    }
  }

  private async attachNameServers(domain: IOpsDomain): Promise<IOpsDomain> {
    const route53 = await this.provider.getAwsRoute53FromAccount(domain.accountName);
    const records = await route53.getRecords(domain.domainName, nameServerRecord);

    domain.nameServers = [];
    if (records !== undefined) {
      for (const record of records) {
        if (record.values) {
          domain.nameServers.push(...record.values);
        }
      }
    }

    return domain;
  }
}
