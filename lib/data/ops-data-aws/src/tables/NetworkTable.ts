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
  const item: any = toKey(network.name);
  item.accountName = { S: network.account };
  item.region = { S: network.region };
  return item;
}

function fromItem(item: any): IOpsNetwork {
  return {
    name: item.networkName.S,
    account: item.accountName.S,
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
  throw OpsDataException.networkAlreadyExists(account.name);
}

function onNetworkDoesNotExist(networkName: string) {
  throw OpsDataException.noNetwork(networkName);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsNetwork {
  name: string;
  account: string;
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

  private constructor(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
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
}
