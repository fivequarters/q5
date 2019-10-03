import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { AccountDataException } from '@5qtrs/account-data';
import { AccountDataAwsConfig } from '../AccountDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'key-value',
  attributes: { category: 'S', key: 'S' },
  keys: ['category', 'key'],
  ttlAttribute: 'ttl',
  toKey,
  toItem,
  fromItem,
};

const MaxTtl = Math.floor(new Date('3000').getTime() / 1000);

// ------------------
// Internal Functions
// ------------------

function toKey(category: string, key: string) {
  return {
    category: { S: category },
    key: { S: key },
  };
}

function toItem(entry: IKeyValueEntry) {
  const item: any = toKey(entry.category, entry.key);
  item.ttl = { N: (entry.ttl || MaxTtl).toString() };
  item.value = { S: entry.value };
  return item;
}

function fromItem(item: any): IKeyValueEntry {
  let result: IKeyValueEntry = {
    category: item.category.S,
    key: item.key.S,
  };
  if (item.value && item.value.S) {
    result.value = item.value.S;
  }
  if (item.ttl && item.ttl.N) {
    result.ttl = item.ttl.N;
  }
  return result;
}

function onNoInitEntry(agentId: string) {
  throw AccountDataException.noInitEntry(agentId);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IKeyValueEntry {
  category: string;
  key: string;
  ttl?: number;
  value?: string;
}

// ----------------
// Exported Classes
// ----------------

export class KeyValueTable extends AwsDynamoTable {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    return new KeyValueTable(config, dynamo);
  }
  private config: AccountDataAwsConfig;

  private constructor(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    super(table, dynamo);
    this.config = config;
  }
}
