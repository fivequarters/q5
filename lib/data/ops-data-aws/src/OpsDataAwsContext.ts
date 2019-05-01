import { DataSource } from '@5qtrs/data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { IOpsDataContext, IOpsAccountData, IOpsDomainData, IOpsNetworkData } from '@5qtrs/ops-data';
import { OpsAccountData } from './OpsAccountData';
import { OpsDomainData } from './OpsDomainData';
import { OpsNetworkData } from './OpsNetworkData';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class OpsDataAwsContext extends DataSource implements IOpsDataContext {
  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    const account = await OpsAccountData.create(config, dynamo);
    const domain = await OpsDomainData.create(config, dynamo);
    const network = await OpsNetworkData.create(config, dynamo);

    return new OpsDataAwsContext(account, domain, network);
  }

  private constructor(account: OpsAccountData, domain: OpsDomainData, network: OpsNetworkData) {
    super([account, domain, network]);
    this.account = account;
    this.domain = domain;
    this.network = network;
  }

  private account: OpsAccountData;
  private domain: OpsDomainData;
  private network: OpsNetworkData;

  public get accountData(): IOpsAccountData {
    return this.account;
  }

  public get domainData(): IOpsDomainData {
    return this.domain;
  }

  public get networkData(): IOpsNetworkData {
    return this.network;
  }
}
