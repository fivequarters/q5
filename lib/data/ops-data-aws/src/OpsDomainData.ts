import { DataSource } from '@5qtrs/data';
import { IOpsDomainData, IOpsDomain, IListOpsDomainOptions, IListOpsDomainResult } from '@5qtrs/ops-data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { DomainTable } from './tables/DomainTable';

// ----------------
// Exported Classes
// ----------------

export class OpsDomainData extends DataSource implements IOpsDomainData {
  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    const domainTable = await DomainTable.create(config, dynamo);
    return new OpsDomainData(domainTable);
  }
  private domainTable: DomainTable;

  private constructor(domainTable: DomainTable) {
    super([domainTable]);
    this.domainTable = domainTable;
  }

  public async add(domain: IOpsDomain): Promise<void> {
    await this.domainTable.add(domain);
  }

  public async get(domainName: string): Promise<IOpsDomain> {
    return this.domainTable.get(domainName);
  }

  public async list(options?: IListOpsDomainOptions): Promise<IListOpsDomainResult> {
    return this.domainTable.list(options);
  }
}
