import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { AccountDataAwsConfig } from '../AccountDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const fromRoleIndex = 'fromRole';
const accountIdIndex = 'accountId';
const delimiter = '::';
const noFromRole = '<none>';

const table: IAwsDynamoTable = {
  name: 'access',
  attributes: { agentId: 'S', entry: 'S', accountId: 'S', fromRole: 'S' },
  keys: ['agentId', 'entry'],
  toKey,
  toItem,
  fromItem,
  globalIndexes: [
    {
      name: accountIdIndex,
      keys: ['accountId', 'entry'],
    },
  ],
  localIndexes: [
    {
      name: fromRoleIndex,
      keys: ['agentId', 'fromRole'],
    },
  ],
};

// ------------------
// Internal Functions
// ------------------

function toKey(accessEntry: IAccessEntry, agentId: string) {
  const entry = [accessEntry.resource, accessEntry.action, accessEntry.fromRole || noFromRole].join(delimiter);
  return {
    agentId: { S: agentId },
    entry: { S: entry },
  };
}

function toItem(accessEntry: IAccessEntry, { accountId, agentId }: { accountId: string; agentId: string }) {
  const item: any = toKey(accessEntry, agentId);
  item.accountId = { S: accountId };
  item.fromRole = { S: accessEntry.fromRole || noFromRole };
  item.allow = { BOOL: accessEntry.allow === true ? true : false };
  return item;
}

function fromItem(item: any): IAccessEntry {
  const entry = item.entry.S;
  const [resource, action, fromRole] = entry.split(delimiter);
  return {
    resource,
    action,
    fromRole: fromRole === noFromRole ? undefined : fromRole,
    allow: item.allow && item.allow.BOOL === true ? true : false,
  };
}

function getConfig(config: AccountDataAwsConfig) {
  return () => ({
    defaultLimit: config.accessEntryDefaultLimit,
    maxLimit: config.accessEntryMaxLimit,
  });
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAccessEntry {
  resource: string;
  action: string;
  fromRole?: string;
  allow?: boolean;
}

export interface IListAccessEntriesOptions {
  next?: string;
  limit?: number;
  resourcePrefix?: string;
}

export interface IListAccessEntriesResult {
  next?: string;
  items: IAccessEntry[];
}

// ----------------
// Exported Classes
// ----------------

export class AccessEntryTable extends AwsDynamoTable {
  private config: AccountDataAwsConfig;
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    return new AccessEntryTable(config, dynamo);
  }

  private constructor(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
    this.config = config;
  }

  public async add(accountId: string, agentId: string, accessEntry: IAccessEntry): Promise<void> {
    const options = { context: { accountId, agentId } };
    await this.putItem(accessEntry, options);
  }

  public async addAll(accountId: string, agentId: string, entries: IAccessEntry[]): Promise<void> {
    const options = { context: { accountId, agentId } };
    await this.putAllItems(entries, options);
  }

  public async list(agentId: string, options: IListAccessEntriesOptions): Promise<IListAccessEntriesResult> {
    const filters = [];
    const keyConditions = ['agentId = :agentId'];
    const expressionValues: any = { ':agentId': { S: agentId } };

    if (options && options.resourcePrefix) {
      filters.push('begins_with(resource, :resource)');
      expressionValues[':resource'] = { S: options.resourcePrefix };
    }

    const queryOptions = {
      limit: options && options.limit ? options.limit : undefined,
      next: options && options.next ? options.next : undefined,
      expressionValues,
      keyConditions,
      filters,
    };

    return this.queryTable(queryOptions);
  }

  public async listAll(agentId: string): Promise<IAccessEntry[]> {
    const all = [];
    const options: IListAccessEntriesOptions = { next: undefined, limit: this.config.accessEntryMaxLimit };
    do {
      const result = await this.list(agentId, options);
      all.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return all;
  }

  public async delete(agentId: string, resource: string, action: string, fromRole?: string): Promise<void> {
    const options = { context: agentId };
    await this.deleteItem({ resource, action, fromRole }, options);
  }

  public async deleteAll(agentId: string, accessEntries?: IAccessEntry[]): Promise<void> {
    const keys = accessEntries ? accessEntries : await this.listAll(agentId);
    const options = { context: agentId };
    await this.deleteAllItems(keys, options);
  }
}
