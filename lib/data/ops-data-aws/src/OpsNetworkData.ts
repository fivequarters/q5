import { DataSource } from '@5qtrs/data';
import {
  IOpsNetworkData,
  IOpsNewNetwork,
  IOpsNetwork,
  IListOpsNetworkOptions,
  IListOpsNetworkResult,
  OpsDataException,
  OpsDataExceptionCode,
} from '@5qtrs/ops-data';
import { OpsDataTables } from './OpsDataTables';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class OpsNetworkData extends DataSource implements IOpsNetworkData {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider, tables: OpsDataTables) {
    return new OpsNetworkData(config, provider, tables);
  }
  private config: OpsDataAwsConfig;
  private provider: OpsDataAwsProvider;
  private tables: OpsDataTables;

  private constructor(config: OpsDataAwsConfig, provider: OpsDataAwsProvider, tables: OpsDataTables) {
    super([]);
    this.config = config;
    this.tables = tables;
    this.provider = provider;
  }

  public async exists(network: IOpsNetwork): Promise<boolean> {
    try {
      const existing = await this.tables.networkTable.get(network.networkName, network.region);
      if (existing.accountName !== network.accountName) {
        throw OpsDataException.networkDifferentAccount(network.networkName, existing.accountName);
      }
      if (existing.region !== network.region) {
        throw OpsDataException.networkDifferentRegion(network.networkName, existing.region);
      }
      await this.attachNetworkDetails(network);
      return true;
    } catch (error) {
      if (error.code === OpsDataExceptionCode.noNetwork) {
        return false;
      }
      throw error;
    }
  }

  public async add(network: IOpsNewNetwork): Promise<IOpsNetwork> {
    await this.tables.networkTable.add(network);
    return this.attachNetworkDetails(network);
  }

  public async get(networkName: string, region: string): Promise<IOpsNetwork> {
    const network = await this.tables.networkTable.get(networkName, region);
    return this.attachNetworkDetails(network);
  }

  public async list(options?: IListOpsNetworkOptions): Promise<IListOpsNetworkResult> {
    const result = await this.tables.networkTable.list(options);
    const items = await Promise.all(result.items.map(network => this.attachNetworkDetails(network)));
    return {
      next: result.next,
      items,
    };
  }

  public async listAll(networkName?: string): Promise<IOpsNetwork[]> {
    const networks = await this.tables.networkTable.listAll(networkName);
    return Promise.all(networks.map(network => this.attachNetworkDetails(network)));
  }

  private async attachNetworkDetails(network: IOpsNewNetwork): Promise<IOpsNetwork> {
    const awsNetwork = await this.provider.getAwsNetworkFromAccount(network.accountName, network.region);
    const networkDetails = await awsNetwork.ensureNetwork(
      network.networkName,
      network.existingVpcId,
      network.existingPublicSubnetIds,
      network.existingPrivateSubnetIds
    );
    return {
      networkName: network.networkName,
      accountName: network.accountName,
      region: network.region,
      vpcId: networkDetails.vpcId,
      securityGroupId: networkDetails.securityGroupId,
      lambdaSecurityGroupId: networkDetails.lambdaSecurityGroupId,
      publicSubnets: networkDetails.publicSubnets,
      privateSubnets: networkDetails.privateSubnets,
    };
  }
}
