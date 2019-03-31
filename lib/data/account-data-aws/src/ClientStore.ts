import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { toBase64, fromBase64 } from '@5qtrs/base64';
import { random } from '@5qtrs/random';

// ------------------
// Internal Constants
// ------------------

const tableName = 'client';
const idLength = 16;
const defaultLimit = 25;
const maxLimit = 100;
const delimiter = ':';

// ------------------
// Internal Functions
// ------------------

function generateClientId() {
  return `clt-${random({ lengthInBytes: idLength / 2 })}`;
}

function toDynamoKey(accountId: string, clientId: string) {
  return {
    accountId: { S: accountId },
    clientId: { S: clientId },
  };
}

function toDynamoItem(accountId: string, client: IBaseClient) {
  const item: any = toDynamoKey(accountId, client.id);
  item.displayName = client.displayName ? { S: client.displayName } : undefined;
  item.archived = { BOOL: client.archived || false };
  return item;
}

function mergeFromDynamoItem(client: IBaseClient, item: any) {
  client.displayName = !client.displayName && item.displayName ? item.displayName.S : client.displayName || '';
}

function fromDynamoItem(item: any): IBaseClient {
  const client: IBaseClient = {
    id: item.clientId.S,
    archived: item.archived && item.archived.BOOL !== false ? true : undefined,
  };
  mergeFromDynamoItem(client, item);
  return client;
}

function nextToMarker(next: any) {
  return next ? toBase64([next.accountId.S, next.clientId.S].join(delimiter)) : undefined;
}

function nextFromMarker(marker: string) {
  if (!marker) {
    return undefined;
  }
  const [accountId, clientId] = fromBase64(marker).split(delimiter);
  return toDynamoKey(accountId, clientId);
}

// -------------------
// Exported Interfaces
// -------------------

export interface INewBaseClient {
  archived?: boolean;
  displayName?: string;
}

export interface IBaseClient extends INewBaseClient {
  id: string;
}

export interface IGetClientOptions {
  includeArchived?: boolean;
}

export interface IListBaseClientsOptions {
  next?: string;
  limit?: number;
  displayNameContains?: string;
  includeArchived?: boolean;
}

export interface IListClientsResult {
  next?: string;
  items: IBaseClient[];
}

// ----------------
// Exported Classes
// ----------------

export class ClientStore {
  private dynamo: AwsDynamo;

  private constructor(dynamo: AwsDynamo) {
    this.dynamo = dynamo;
  }

  public static async create(dynamo: AwsDynamo) {
    return new ClientStore(dynamo);
  }

  public async isSetup() {
    return this.dynamo.tableExists(tableName);
  }

  public async setup() {
    return this.dynamo.ensureTable({
      name: tableName,
      attributes: { accountId: 'S', clientId: 'S' },
      keys: ['accountId', 'clientId'],
    });
  }

  public async addClient(accountId: string, newClient: INewBaseClient): Promise<IBaseClient> {
    const options = {
      expressionNames: { '#clientId': 'clientId' },
      condition: 'attribute_not_exists(#clientId)',
      onCollision: (item: any) => (item.clientId.S = generateClientId()),
    };

    const client = {
      id: generateClientId(),
      displayName: newClient.displayName,
      archived: false,
    };

    const item = toDynamoItem(accountId, client);
    const finalItem = await this.dynamo.addItem(tableName, item, options);
    return fromDynamoItem(finalItem);
  }

  public async updateClient(accountId: string, client: IBaseClient): Promise<IBaseClient | undefined> {
    const updates = [];
    const expressionNames: any = { '#archived': 'archived' };
    const expressionValues: any = { ':archived': { BOOL: false } };

    if (client.displayName) {
      updates.push('#displayName = :displayName');
      expressionNames['#displayName'] = 'displayName';
      expressionValues[':displayName'] = { S: client.displayName };
    }

    const options = {
      update: updates.length ? `SET ${updates.join(', ')}` : undefined,
      condition: '#archived = :archived',
      expressionNames,
      expressionValues,
      returnOld: true,
    };

    const key = toDynamoKey(accountId, client.id);
    try {
      const item = await this.dynamo.updateItem(tableName, key, options);
      mergeFromDynamoItem(client, item);
      return client;
    } catch (error) {
      if (error.code !== 'ConditionalCheckFailedException') {
        throw error;
      }
    }

    return undefined;
  }

  public async archiveClient(accountId: string, clientId: string): Promise<boolean> {
    return this.setArchived(accountId, clientId, true);
  }

  public async unArchiveClient(accountId: string, clientId: string): Promise<boolean> {
    return this.setArchived(accountId, clientId, false);
  }

  public async getClient(
    accountId: string,
    clientId: string,
    options?: IGetClientOptions
  ): Promise<IBaseClient | undefined> {
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const key = toDynamoKey(accountId, clientId);
    const item = await this.dynamo.getItem(tableName, key);
    if (item) {
      const client = fromDynamoItem(item);
      if (includeArchived || !client.archived) {
        return client;
      }
    }
    return undefined;
  }

  public async listClients(accountId: string, options?: IListBaseClientsOptions): Promise<IListClientsResult> {
    const next = options && options.next ? options.next : undefined;
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const displayNameContains = options && options.displayNameContains ? options.displayNameContains : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit < maxLimit ? limit : maxLimit;

    const filters = [];
    const expressionNames: any = { '#accountId': 'accountId' };
    const expressionValues: any = { ':accountId': { S: accountId } };

    if (!includeArchived) {
      filters.push('#archived = :archived');
      expressionNames['#archived'] = 'archived';
      expressionValues[':archived'] = { BOOL: false };
    }

    if (displayNameContains) {
      filters.push('contains(#displayName, :displayName)');
      expressionNames['#displayName'] = 'displayName';
      expressionValues[':displayName'] = { S: displayNameContains };
    }

    const queryOptions = {
      expressionNames,
      expressionValues,
      keyCondition: '#accountId = :accountId',
      next: next ? nextFromMarker(next) : undefined,
      filter: filters.length ? filters.join(' and ') : undefined,
    };

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    const items = result.items.slice(0, limit);
    return {
      next: result.next || items.length === limit ? nextToMarker(items[items.length - 1]) : undefined,
      items: items.map(fromDynamoItem),
    };
  }

  private async setArchived(accountId: string, clientId: string, archived: boolean): Promise<boolean> {
    const options = {
      update: 'SET #archived = :archived',
      expressionNames: { '#archived': 'archived' },
      expressionValues: { ':archived': { BOOL: archived } },
    };

    const key = toDynamoKey(accountId, clientId);
    const item = await this.dynamo.updateItem(tableName, key, options);
    if (!item) {
      return false;
    }
    const user = fromDynamoItem(item);
    return user.archived !== archived;
  }
}
