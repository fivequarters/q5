import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { notIn } from '@5qtrs/array';

// ------------------
// Internal Constants
// ------------------

const tableName = 'access-entry';
const fromRoleIndex = 'byFromRole';
const accountIndex = 'byAccountId';
const defaultLimit = 25;
const maxLimit = 100;
const delimiter = '::';
const noFromRole = '<none>';

// ------------------
// Internal Functions
// ------------------

function toDynamoKey(agentId: string, accessEntry: IAccessEntry) {
  const entry = [accessEntry.resource, accessEntry.action, accessEntry.fromRole || noFromRole].join(delimiter);
  return {
    agentId: { S: agentId },
    entry: { S: entry },
  };
}

function toDynamoItem(accountId: string, agentId: string, accessEntry: IAccessEntry) {
  const item: any = toDynamoKey(agentId, accessEntry);
  item.accountId = { S: accountId };
  item.fromRole = { S: accessEntry.fromRole || noFromRole };
  item.allow = { BOOL: accessEntry.allow === true ? true : false };
  return item;
}

function fromDynamoItem(item: any): IAccessEntry {
  const entry = item.entry.S;
  const [resource, action, fromRole] = entry.split(delimiter);
  return {
    resource,
    action,
    fromRole: fromRole === noFromRole ? undefined : fromRole,
    allow: item.allow && item.allow.BOOL === true ? true : false,
  };
}

function areEqual(accessEntry1: IAccessEntry, accessEntry2: IAccessEntry) {
  return (
    accessEntry1.resource === accessEntry2.resource &&
    accessEntry1.action === accessEntry2.action &&
    accessEntry1.fromRole === accessEntry2.fromRole &&
    accessEntry1.allow === accessEntry2.allow
  );
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

export class AccessEntryStore {
  private dynamo: AwsDynamo;

  private constructor(dynamo: AwsDynamo) {
    this.dynamo = dynamo;
  }

  public static async create(dynamo: AwsDynamo) {
    return new AccessEntryStore(dynamo);
  }

  public async isSetup() {
    return this.dynamo.tableExists(tableName);
  }

  public async setup() {
    return this.dynamo.ensureTable({
      name: tableName,
      attributes: { agentId: 'S', entry: 'S', accountId: 'S', fromRole: 'S' },
      keys: ['agentId', 'entry'],
      globalIndexes: [
        {
          name: accountIndex,
          keys: ['accountId', 'entry'],
        },
      ],
      localIndexes: [
        {
          name: fromRoleIndex,
          keys: ['agentId', 'fromRole'],
        },
      ],
    });
  }

  public async addAccessEntry(accountId: string, agentId: string, newAccessEntry: IAccessEntry): Promise<IAccessEntry> {
    const item = toDynamoItem(accountId, agentId, newAccessEntry);
    await this.dynamo.putItem(tableName, item);
    return newAccessEntry;
  }

  public async addAllAccessEntries(
    accountId: string,
    agentId: string,
    accessEntries: IAccessEntry[]
  ): Promise<IAccessEntry[]> {
    const items = accessEntries.map(accessEntry => toDynamoItem(accountId, agentId, accessEntry));
    await this.dynamo.putAll(tableName, items);
    return accessEntries;
  }

  public async replaceAllAccessEntries(
    accountId: string,
    agentId: string,
    accessEntries: IAccessEntry[]
  ): Promise<IAccessEntry[]> {
    const existingAccessEntries = await this.listAllAccessEntries(agentId);
    const toAdd = notIn(accessEntries, existingAccessEntries, areEqual);
    const toRemove = notIn(existingAccessEntries, accessEntries, areEqual);
    console.log('Replace access', toAdd, toRemove);
    await Promise.all([
      this.addAllAccessEntries(accountId, agentId, toAdd),
      this.removeAllAccessEntries(agentId, toRemove),
    ]);
    return accessEntries;
  }

  public async listAllAccessEntries(agentId: string): Promise<IAccessEntry[]> {
    const all = [];
    const options: IListAccessEntriesOptions = { next: undefined, limit: maxLimit };
    do {
      const result = await this.listAccessEntries(agentId, options);
      all.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return all;
  }

  public async listAccessEntries(
    agentId: string,
    options: IListAccessEntriesOptions
  ): Promise<IListAccessEntriesResult> {
    const next = options && options.next ? options.next : undefined;
    const resourcePrefix = options && options.resourcePrefix ? options.resourcePrefix : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit < maxLimit ? limit : maxLimit;

    const filters = [];
    const expressionNames: any = { '#agentId': 'agentId' };
    const expressionValues: any = { ':agentId': { S: agentId } };

    if (resourcePrefix) {
      filters.push('begins_with(#resource, :resource)');
      expressionNames['#resource'] = 'resource';
      expressionValues[':resource'] = { S: resourcePrefix };
    }

    const queryOptions = {
      expressionNames,
      expressionValues,
      keyCondition: '#agentId = :agentId',
      limit: limit || undefined,
      next: next || undefined,
      filter: filters.length ? filters.join(' and ') : undefined,
    };

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    const items = result.items.map(fromDynamoItem);
    return {
      next: result.next || undefined,
      items,
    };
  }

  public async removeAccessEntry(agentId: string, resource: string, action: string, fromRole?: string): Promise<void> {
    const key = toDynamoKey(agentId, { resource, action, fromRole });
    return this.dynamo.deleteItem(tableName, key);
  }

  public async removeAllAccessEntries(agentId: string, accessEntries?: IAccessEntry[]): Promise<void> {
    const toRemove = accessEntries ? accessEntries : await this.listAllAccessEntries(agentId);
    const keys = toRemove.map(accessEntry => toDynamoKey(agentId, accessEntry));
    return this.dynamo.deleteAll(tableName, keys);
  }
}
