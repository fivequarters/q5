import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { OpsDataException } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '../OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const delimiter = '::';
const table: IAwsDynamoTable = {
  name: 'stack',
  attributes: { deploymentName: 'S', regionStackId: 'S' },
  keys: ['deploymentName', 'regionStackId'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(key: { id: number; deploymentName: string; region: string }) {
  return {
    regionStackId: { S: [key.region, key.id.toString()].join(delimiter) },
    deploymentName: { S: key.deploymentName },
  };
}

function toItem(stack: IOpsStack) {
  const item: any = toKey(stack);
  item.tag = { S: stack.tag };
  item.size = { N: stack.size.toString() };
  item.active = { BOOL: stack.active };
  if (process.env.FUSEOPS_VERSION) {
    item.fuseopsVersion = { S: process.env.FUSEOPS_VERSION };
  }

  return item;
}

function fromItem(item: any): IOpsStack {
  const [region, stackId] = item.regionStackId.S.split(delimiter);
  return {
    deploymentName: item.deploymentName.S,
    region,
    id: parseInt(stackId, 10),
    tag: item.tag.S,
    size: parseInt(item.size.N, 10),
    active: item.active.BOOL,
    fuseopsVersion: item.fuseopsVersion === undefined ? '' : item.fuseopsVersion.S,
  };
}

function getConfig(config: OpsDataAwsConfig) {
  return () => ({
    defaultLimit: config.accountDefaultLimit,
    maxLimit: config.accountMaxLimit,
  });
}

function onStackAlreadyExists(stack: IOpsStack) {
  throw OpsDataException.stackAlreadyExists(stack.id, stack.deploymentName);
}

function onStackDoesNotExist(deploymentName: string) {
  return (stackId: number) => {
    throw OpsDataException.noStack(stackId, deploymentName);
  };
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsStack {
  id: number;
  deploymentName: string;
  region: string;
  tag: string;
  size: number;
  active: boolean;
  fuseopsVersion: string;
}

export interface IListOpsStackOptions {
  deploymentName?: string;
  next?: string;
  limit?: number;
}

export interface IListOpsStackResult {
  next?: string;
  items: IOpsStack[];
}

// ----------------
// Exported Classes
// ----------------

export class StackTable extends AwsDynamoTable {
  private config: OpsDataAwsConfig;

  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    return new StackTable(config, dynamo);
  }

  private constructor(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
    this.config = config;
  }

  public async add(stack: IOpsStack): Promise<void> {
    const options = { onConditionCheckFailed: onStackAlreadyExists };
    return this.addItem(stack, options);
  }

  public async get(deploymentName: string, region: string, id: number): Promise<IOpsStack> {
    const options = { onNotFound: onStackDoesNotExist(deploymentName) };
    return this.getItem({ deploymentName, region, id }, options);
  }

  public async update(deploymentName: string, region: string, id: number, active: boolean): Promise<IOpsStack> {
    const sets = [];
    const expressionValues: any = {};

    sets.push('active = :active');
    expressionValues[':active'] = { BOOL: active };

    const options = {
      sets,
      expressionValues,
      onConditionCheckFailed: onStackDoesNotExist(deploymentName),
    };

    return this.updateItem({ deploymentName, region, id }, options);
  }

  public async list(options?: IListOpsStackOptions): Promise<IListOpsStackResult> {
    if (options && options.deploymentName) {
      const queryOptions = {
        limit: options && options.limit ? options.limit : undefined,
        next: options && options.next ? options.next : undefined,
        expressionValues: { ':deploymentName': { S: options.deploymentName } },
        keyConditions: ['deploymentName = :deploymentName'],
      };
      return this.queryTable(queryOptions);
    }
    return this.scanTable(options);
  }

  public async listAll(deploymentName?: string): Promise<IOpsStack[]> {
    const deployments = [];
    const options: IListOpsStackOptions = { deploymentName, limit: this.config.accountMaxLimit };
    do {
      const result = await this.list(options);
      deployments.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return deployments;
  }

  public async delete(deploymentName: string, region: string, id: number): Promise<void> {
    const options = { onConditionCheckFailed: onStackDoesNotExist(deploymentName) };
    await this.deleteItem({ deploymentName, region, id }, options);
  }
}
