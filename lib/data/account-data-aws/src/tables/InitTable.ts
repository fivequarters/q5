import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { AccountDataException } from '@5qtrs/account-data';
import { AccountDataAwsConfig } from '../AccountDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'init',
  attributes: { accountId: 'S', agentId: 'S' },
  keys: ['accountId', 'agentId'],
  ttlAttribute: 'ttl',
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(agentId: string, accountId: string) {
  return {
    accountId: { S: accountId },
    agentId: { S: agentId },
  };
}

function toItem(initEntry: IInitEntry, ttl: number) {
  const item: any = toKey(initEntry.agentId, initEntry.accountId);
  item.ttl = { N: resolveTtlInHours(ttl).toString() };
  item.jwtSecret = { S: initEntry.jwtSecret };
  return item;
}

function fromItem(item: any): IInitEntry {
  return {
    accountId: item.accountId.S,
    agentId: item.agentId.S,
    jwtSecret: item.jwtSecret.S,
    ttl: parseInt(item.ttl.N, 10) * 1000,
  };
}

function resolveTtlInHours(ttl: number) {
  return (Date.now() + ttl * 60 * 60 * 1000) / 1000;
}

function onNoInitEntry(agentId: string) {
  throw AccountDataException.noInitEntry(agentId);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IInitEntry {
  accountId: string;
  agentId: string;
  jwtSecret: string;
  ttl?: number;
}

// ----------------
// Exported Classes
// ----------------

export class InitTable extends AwsDynamoTable {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    return new InitTable(config, dynamo);
  }
  private config: AccountDataAwsConfig;

  private constructor(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    super(table, dynamo);
    this.config = config;
  }

  public async add(initEntry: IInitEntry): Promise<void> {
    const options = { context: this.config.initTokenTtlHours };
    await this.putItem(initEntry, options);
  }

  public async get(accountId: string, agentId: string): Promise<IInitEntry> {
    const options = { onNotFound: onNoInitEntry, context: accountId, onConditionCheckFailed: onNoInitEntry };
    const entry = await this.getItem(agentId, options);
    await this.deleteItem(agentId, options);
    return entry;
  }
}
