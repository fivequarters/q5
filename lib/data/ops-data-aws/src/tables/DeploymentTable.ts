import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { OpsDataException } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '../OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'deployment',
  attributes: { deploymentName: 'S' },
  keys: ['deploymentName'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(deploymentName: string) {
  return {
    deploymentName: { S: deploymentName },
  };
}

function toItem(deployment: IOpsDeployment) {
  const item: any = toKey(deployment.deploymentName);
  item.networkName = { S: deployment.networkName };
  item.domainName = { S: deployment.domainName };
  return item;
}

function fromItem(item: any): IOpsDeployment {
  return {
    deploymentName: item.deploymentName.S,
    networkName: item.networkName.S,
    domainName: item.domainName.S,
  };
}

function getConfig(config: OpsDataAwsConfig) {
  return () => ({
    defaultLimit: config.accountDefaultLimit,
    maxLimit: config.accountMaxLimit,
  });
}

function onDeploymentAlreadyExists(deployment: IOpsDeployment) {
  throw OpsDataException.deploymentAlreadyExists(deployment.deploymentName);
}

function onDeploymentDoesNotExist(deploymentName: string) {
  throw OpsDataException.noDeployment(deploymentName);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsDeployment {
  deploymentName: string;
  networkName: string;
  domainName: string;
}

export interface IListOpsDeploymentOptions {
  next?: string;
  limit?: number;
}

export interface IListOpsDeploymentResult {
  next?: string;
  items: IOpsDeployment[];
}

// ----------------
// Exported Classes
// ----------------

export class DeploymentTable extends AwsDynamoTable {
  private config: OpsDataAwsConfig;

  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    return new DeploymentTable(config, dynamo);
  }

  private constructor(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
    this.config = config;
  }

  public async add(deployment: IOpsDeployment): Promise<void> {
    const options = { onConditionCheckFailed: onDeploymentAlreadyExists };
    return this.addItem(deployment, options);
  }

  public async get(deploymentName: string): Promise<IOpsDeployment> {
    const options = { onNotFound: onDeploymentDoesNotExist };
    return this.getItem(deploymentName, options);
  }

  public async list(options?: IListOpsDeploymentOptions): Promise<IListOpsDeploymentResult> {
    return this.scanTable(options);
  }

  public async listAll(): Promise<IOpsDeployment[]> {
    const deployments = [];
    const options: IListOpsDeploymentOptions = { limit: this.config.accountMaxLimit };
    do {
      const result = await this.list(options);
      deployments.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return deployments;
  }

  public async delete(deploymentName: string): Promise<void> {
    const options = { onConditionCheckFailed: onDeploymentDoesNotExist };
    await this.deleteItem(deploymentName, options);
  }
}
