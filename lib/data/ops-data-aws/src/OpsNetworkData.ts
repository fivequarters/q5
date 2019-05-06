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
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AwsNetwork } from '@5qtrs/aws-network';
import { OpsDataAwsProvider } from './OpsDataAwsProvider';
import { OpsDataAwsConfig } from './OpsDataAwsConfig';
import { NetworkTable } from './tables/NetworkTable';

// ----------------
// Exported Classes
// ----------------

export class OpsNetworkData extends DataSource implements IOpsNetworkData {
  public static async create(config: OpsDataAwsConfig, provider: OpsDataAwsProvider) {
    const awsConfig = await provider.getAwsConfigForMain();
    const dynamo = await AwsDynamo.create(awsConfig);
    const networkTable = await NetworkTable.create(config, dynamo);
    return new OpsNetworkData(networkTable, provider);
  }
  private networkTable: NetworkTable;
  private provider: OpsDataAwsProvider;

  private constructor(networkTable: NetworkTable, provider: OpsDataAwsProvider) {
    super([networkTable]);
    this.networkTable = networkTable;
    this.provider = provider;
  }

  public async exists(network: IOpsNetwork): Promise<boolean> {
    try {
      const existing = await this.networkTable.get(network.networkName);
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
    await this.networkTable.add(network);
    return this.attachNetworkDetails(network);
  }

  public async get(networkName: string): Promise<IOpsNetwork> {
    const network = await this.networkTable.get(networkName);
    return this.attachNetworkDetails(network);
  }

  public async list(options?: IListOpsNetworkOptions): Promise<IListOpsNetworkResult> {
    const result = await this.networkTable.list(options);
    const items = await Promise.all(result.items.map(network => this.attachNetworkDetails(network)));
    return {
      next: result.next,
      items,
    };
  }

  public async listAll(): Promise<IOpsNetwork[]> {
    const networks = await this.networkTable.listAll();
    return Promise.all(networks.map(network => this.attachNetworkDetails(network)));
  }

  private async getAwsNetwork(network: IOpsNewNetwork): Promise<AwsNetwork> {
    const awsConfig = await this.provider.getAwsConfig(network.accountName, network.region);
    return AwsNetwork.create(awsConfig);
  }

  private async attachNetworkDetails(network: IOpsNewNetwork): Promise<IOpsNetwork> {
    const awsNetwork = await this.getAwsNetwork(network);
    const networkDetails = await awsNetwork.ensureNetwork(network.networkName);
    return {
      networkName: network.networkName,
      accountName: network.accountName,
      region: network.region,
      vpcId: networkDetails.vpcId,
      securityGroupId: networkDetails.securityGroupId,
      internetGatewayId: networkDetails.internetGatewayId,
      natGatewayId: networkDetails.natGatewayId,
      publicRouteTableId: networkDetails.publicRouteTableId,
      publicSubnets: networkDetails.publicSubnets,
      privateRouteTableId: networkDetails.privateRouteTableId,
      privateSubnets: networkDetails.privateSubnets,
    };
  }
}
