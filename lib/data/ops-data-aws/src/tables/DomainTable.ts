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
  const item: any = toKey(domain.name);
  item.accountName = { S: domain.accountName };
  return item;
}

function fromItem(item: any): IOpsDomain {
  return {
    name: item.domainName.S,
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
  throw OpsDataException.domainAlreadyExists(account.name);
}

function onDomainDoesNotExist(accountName: string) {
  throw OpsDataException.noDomain(accountName);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsDomain {
  name: string;
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
  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    return new DomainTable(config, dynamo);
  }

  private constructor(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
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
}
