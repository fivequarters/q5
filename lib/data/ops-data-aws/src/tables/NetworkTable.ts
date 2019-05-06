import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { OpsDataException } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '../OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'network',
  attributes: { networkName: 'S' },
  keys: ['networkName'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(networkName: string) {
  return {
    networkName: { S: networkName },
  };
}

function toItem(network: IOpsNetwork) {
  const item: any = toKey(network.networkName);
  item.accountName = { S: network.accountName };
  item.region = { S: network.region };
  return item;
}

function fromItem(item: any): IOpsNetwork {
  return {
    networkName: item.networkName.S,
    accountName: item.accountName.S,
    region: item.region.S,
  };
}

function getConfig(config: OpsDataAwsConfig) {
  return () => ({
    defaultLimit: config.networkDefaultLimit,
    maxLimit: config.networkMaxLimit,
  });
}

function onNetworkAlreadyExists(account: IOpsNetwork) {
  throw OpsDataException.networkAlreadyExists(account.accountName);
}

function onNetworkDoesNotExist(networkName: string) {
  throw OpsDataException.noNetwork(networkName);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsNetwork {
  networkName: string;
  accountName: string;
  region: string;
}

export interface IListOpsNetworkOptions {
  next?: string;
  limit?: number;
}

export interface IListOpsNetworkResult {
  next?: string;
  items: IOpsNetwork[];
}

// ----------------
// Exported Classes
// ----------------

export class NetworkTable extends AwsDynamoTable {
  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    return new NetworkTable(config, dynamo);
  }
  private config: OpsDataAwsConfig;

  private constructor(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
    this.config = config;
  }

  public async add(domain: IOpsNetwork): Promise<void> {
    const options = { onConditionCheckFailed: onNetworkAlreadyExists };
    return this.addItem(domain, options);
  }

  public async get(domainName: string): Promise<IOpsNetwork> {
    const options = { onNotFound: onNetworkDoesNotExist };
    return this.getItem(domainName, options);
  }

  public async list(options?: IListOpsNetworkOptions): Promise<IListOpsNetworkResult> {
    return this.scanTable(options);
  }

  public async listAll(): Promise<IOpsNetwork[]> {
    const networks = [];
    const options: IListOpsNetworkOptions = { limit: this.config.accountMaxLimit };
    do {
      const result = await this.list(options);
      networks.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return networks;
  }

  public async delete(networkName: string): Promise<void> {
    const options = { onConditionCheckFailed: onNetworkDoesNotExist };
    await this.deleteItem(networkName, options);
  }
}
