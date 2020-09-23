import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { OpsDataException } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '../OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'domain',
  attributes: { domainName: 'S' },
  keys: ['domainName'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(domainName: string) {
  return {
    domainName: { S: domainName },
  };
}

function toItem(domain: IOpsDomain) {
  const item: any = toKey(domain.domainName);
  item.accountName = { S: domain.accountName };
  if (process.env.FUSEOPS_VERSION) {
    item.fuseopsVersion = { S: process.env.FUSEOPS_VERSION };
  }

  return item;
}

function fromItem(item: any): IOpsDomain {
  return {
    domainName: item.domainName.S,
    accountName: item.accountName.S,
  };
}

function getConfig(config: OpsDataAwsConfig) {
  return () => ({
    defaultLimit: config.domainDefaultLimit,
    maxLimit: config.domainMaxLimit,
  });
}

function onDomainAlreadyExists(account: IOpsDomain) {
  throw OpsDataException.domainAlreadyExists(account.domainName);
}

function onDomainDoesNotExist(domainName: string) {
  throw OpsDataException.noDomain(domainName);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsDomain {
  domainName: string;
  accountName: string;
}

export interface IListOpsDomainOptions {
  next?: string;
  limit?: number;
}

export interface IListOpsDomainResult {
  next?: string;
  items: IOpsDomain[];
}

// ----------------
// Exported Classes
// ----------------

export class DomainTable extends AwsDynamoTable {
  private config: OpsDataAwsConfig;

  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    return new DomainTable(config, dynamo);
  }

  private constructor(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
    this.config = config;
  }

  public async add(domain: IOpsDomain): Promise<void> {
    const options = { onConditionCheckFailed: onDomainAlreadyExists };
    return this.addItem(domain, options);
  }

  public async get(domainName: string): Promise<IOpsDomain> {
    const options = { onNotFound: onDomainDoesNotExist };
    return this.getItem(domainName, options);
  }

  public async list(options?: IListOpsDomainOptions): Promise<IListOpsDomainResult> {
    return this.scanTable(options);
  }

  public async listAll(): Promise<IOpsDomain[]> {
    const domains = [];
    const options: IListOpsDomainOptions = { limit: this.config.accountMaxLimit };
    do {
      const result = await this.list(options);
      domains.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return domains;
  }

  public async delete(domainName: string): Promise<void> {
    const options = { onConditionCheckFailed: onDomainDoesNotExist };
    await this.deleteItem(domainName, options);
  }
}
