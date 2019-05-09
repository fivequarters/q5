import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { OpsDataException } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '../OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'stack',
  attributes: { deploymentName: 'S', stackId: 'N' },
  keys: ['deploymentName', 'stackId'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(id: number, deploymentName: string) {
  return {
    stackId: { N: id.toString() },
    deploymentName: { S: deploymentName },
  };
}

function toItem(stack: IOpsStack) {
  const item: any = toKey(stack.id, stack.deploymentName);
  item.tag = { S: stack.tag };
  return item;
}

function fromItem(item: any): IOpsStack {
  return {
    id: parseInt(item.stackId.N, 10),
    deploymentName: item.deploymentName.S,
    tag: item.tag.S,
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
  tag: string;
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

  public async get(stackId: number, deploymentName: string): Promise<IOpsStack> {
    const options = { onNotFound: onStackDoesNotExist(deploymentName), context: deploymentName };
    return this.getItem(stackId, options);
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

  public async delete(stackId: string, deploymentName: string): Promise<void> {
    const options = { onConditionCheckFailed: onStackDoesNotExist(deploymentName), context: deploymentName };
    await this.deleteItem(stackId, options);
  }
}
