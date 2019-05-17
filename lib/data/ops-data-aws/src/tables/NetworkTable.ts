import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { OpsDataException } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '../OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'network',
  attributes: { networkName: 'S', region: 'S' },
  keys: ['networkName', 'region'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(key: { networkName: string; region: string }) {
  return {
    networkName: { S: key.networkName },
    region: { S: key.region },
  };
}

function toItem(network: IOpsNetwork) {
  const item: any = toKey(network);
  item.accountName = { S: network.accountName };
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
  networkName?: string;
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

  public async add(network: IOpsNetwork): Promise<void> {
    const options = { onConditionCheckFailed: onNetworkAlreadyExists };
    return this.addItem(network, options);
  }

  public async get(networkName: string, region: string): Promise<IOpsNetwork> {
    const options = { onNotFound: onNetworkDoesNotExist };
    return this.getItem({ networkName, region }, options);
  }

  public async list(options?: IListOpsNetworkOptions): Promise<IListOpsNetworkResult> {
    if (options && options.networkName) {
      const queryOptions = {
        limit: options && options.limit ? options.limit : undefined,
        next: options && options.next ? options.next : undefined,
        expressionValues: { ':networkName': { S: options.networkName } },
        keyConditions: ['networkName = :networkName'],
      };
      return this.queryTable(queryOptions);
    }
    return this.scanTable(options);
  }

  public async listAll(networkName?: string): Promise<IOpsNetwork[]> {
    const networks = [];
    const options: IListOpsNetworkOptions = { limit: this.config.accountMaxLimit, networkName };
    do {
      const result = await this.list(options);
      networks.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return networks;
  }

  public async delete(networkName: string, region: string): Promise<void> {
    const options = { onConditionCheckFailed: onNetworkDoesNotExist };
    await this.deleteItem({ networkName, region }, options);
  }
}
