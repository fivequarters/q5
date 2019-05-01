import { DataSource } from '@5qtrs/data';
import { IOpsNetworkData, IOpsNetwork, IListOpsNetworkOptions, IListOpsNetworkResult } from '@5qtrs/ops-data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { NetworkTable } from './tables/NetworkTable';

// ----------------
// Exported Classes
// ----------------

export class OpsNetworkData extends DataSource implements IOpsNetworkData {
  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    const networkTable = await NetworkTable.create(config, dynamo);
    return new OpsNetworkData(networkTable);
  }
  private networkTable: NetworkTable;

  private constructor(networkTable: NetworkTable) {
    super([networkTable]);
    this.networkTable = networkTable;
  }

  public async add(network: IOpsNetwork): Promise<void> {
    await this.networkTable.add(network);
  }

  public async get(networkName: string): Promise<IOpsNetwork> {
    return this.networkTable.get(networkName);
  }

  public async list(options?: IListOpsNetworkOptions): Promise<IListOpsNetworkResult> {
    return this.networkTable.list(options);
  }
}
