import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { OpsDataException } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '../OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'deployment',
  attributes: { deploymentName: 'S', region: 'S' },
  keys: ['deploymentName', 'region'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(key: { deploymentName: string; region: string }) {
  return {
    deploymentName: { S: key.deploymentName },
    region: { S: key.region },
  };
}

function toItem(deployment: IOpsDeployment) {
  const item: any = toKey(deployment);
  item.networkName = { S: deployment.networkName };
  item.domainName = { S: deployment.domainName };
  item.size = { N: deployment.size.toString() };
  if (process.env.FUSEOPS_VERSION) {
    item.fuseopsVersion = { S: process.env.FUSEOPS_VERSION };
  }

  // Support clearing the Segment Key parameter using an empty string.
  if (!deployment.segmentKey) {
    delete item.segmentKey;
  } else {
    item.segmentKey = { S: deployment.segmentKey };
  }

  // Support clearing the Grafana key parameter using an empty string.
  if (!deployment.grafana) {
    delete item.grafana;
  } else {
    item.grafana = { S: deployment.grafana };
  }

  // Support clearing the Elastic Search parameter using an empty string.
  if (deployment.elasticSearch.length === 0) {
    delete item.elasticSearch;
  } else {
    item.elasticSearch = { S: deployment.elasticSearch };
  }

  item.dataWarehouseEnabled = { BOOL: deployment.dataWarehouseEnabled };
  item.featureUseDnsS3Bucket = { BOOL: deployment.featureUseDnsS3Bucket };
  return item;
}

function fromItem(item: any): IOpsDeployment {
  return {
    deploymentName: item.deploymentName.S,
    region: item.region.S,
    networkName: item.networkName.S,
    domainName: item.domainName.S,
    size: parseInt(item.size.N, 10),
    segmentKey: item.segmentKey === undefined ? '' : item.segmentKey.S,
    elasticSearch: item.elasticSearch === undefined ? '' : item.elasticSearch.S,
    fuseopsVersion: item.fuseopsVersion === undefined ? '' : item.fuseopsVersion.S,
    dataWarehouseEnabled: item.dataWarehouseEnabled.BOOL,
    featureUseDnsS3Bucket: item.featureUseDnsS3Bucket && item.featureUseDnsS3Bucket.BOOL,
    grafana: item.grafana && item.grafana.S,
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
  region: string;
  networkName: string;
  domainName: string;
  size: number;
  segmentKey: string;
  elasticSearch: string;
  fuseopsVersion: string;
  dataWarehouseEnabled: boolean;
  featureUseDnsS3Bucket: boolean;
  grafana?: string;
}

export interface IListOpsDeploymentOptions {
  deploymentName?: string;
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

  public async get(deploymentName: string, region: string): Promise<IOpsDeployment> {
    const options = { onNotFound: onDeploymentDoesNotExist };
    return this.getItem({ deploymentName, region }, options);
  }

  public async list(options?: IListOpsDeploymentOptions): Promise<IListOpsDeploymentResult> {
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

  public async listAll(deploymentName?: string): Promise<IOpsDeployment[]> {
    const deployments = [];
    const options: IListOpsDeploymentOptions = { limit: this.config.accountMaxLimit, deploymentName };
    do {
      const result = await this.list(options);
      deployments.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return deployments;
  }

  public async delete(deploymentName: string, region: string): Promise<void> {
    const options = { onConditionCheckFailed: onDeploymentDoesNotExist };
    await this.deleteItem({ deploymentName, region }, options);
  }

  public async update(deployment: IOpsDeployment): Promise<void> {
    const options = { onConditionCheckFailed: onDeploymentDoesNotExist };
    await this.putItem(deployment, options);
  }
}
