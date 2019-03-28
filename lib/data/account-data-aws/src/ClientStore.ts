import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { random } from '@5qtrs/random';

// ------------------
// Internal Constants
// ------------------

const tableName = 'client';
const idLength = 16;
const defaultLimit = 25;
const maxLimit = 100;

// ------------------
// Internal Functions
// ------------------

function generateClientId() {
  return `clt-${random({ lengthInBytes: idLength / 2 })}`;
}

function toDynamoKey(accountId: string, client: IBaseClient) {
  return {
    accountId: { S: accountId },
    clientId: { S: client.id },
  };
}

function toDynamoItem(accountId: string, client: IBaseClient) {
  const item: any = toDynamoKey(accountId, client);
  item.displayName = client.displayName ? { S: client.displayName } : undefined;
  return item;
}

function mergeFromDynamoItem(client: IBaseClient, item: any) {
  client.displayName = !client.displayName && item.displayName ? item.displayName.S : client.displayName || '';
}

function fromDynamoItem(item: any): IBaseClient {
  const client: IBaseClient = { id: item.clientId.S, archived: item.archived.BOOL == false ? true : undefined };
  mergeFromDynamoItem(client, item);
  return client;
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

export interface IListClientsOptions {
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
    };

    const item = toDynamoItem(accountId, client);
    const finalItem = await this.dynamo.addItem(tableName, item, options);
    return fromDynamoItem(finalItem);
  }

  public async updateClient(accountId: string, client: IBaseClient): Promise<IBaseClient> {
    const updates = [];
    const expressionNames: any = { '#archived': 'archived' };
    const expressionValues: any = { ':archived': { BOOL: true } };

    if (client.displayName) {
      updates.push('SET #displayName = :displayName');
      expressionNames['#displayName'] = 'displayName';
      expressionValues[':displayName'] = { S: client.displayName };
    }

    const options = {
      update: updates.join(),
      condtion: '#archived = :archived',
      expressionNames,
      expressionValues,
      returnOld: true,
    };

    const key = toDynamoKey(accountId, client);
    const item = await this.dynamo.updateItem(tableName, key, options);
    mergeFromDynamoItem(client, item);
    return client;
  }

  public async archiveClient(accountId: string, clientId: string): Promise<void> {
    return this.setArchived(accountId, clientId, true);
  }

  public async unArchiveClient(accountId: string, clientId: string): Promise<void> {
    return this.setArchived(accountId, clientId, false);
  }

  public async getClient(
    accountId: string,
    clientId: string,
    options?: IGetClientOptions
  ): Promise<IBaseClient | undefined> {
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const key = toDynamoKey(accountId, { id: clientId });
    const item = await this.dynamo.getItem(tableName, key);
    if (item) {
      const client = fromDynamoItem(item);
      if (includeArchived || !client.archived) {
        return client;
      }
    }
    return undefined;
  }

  public async listClients(accountId: string, options?: IListClientsOptions): Promise<IListClientsResult> {
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
      expressionNames['#archived'] = 'firstName';
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
      keyCondtion: '#accountId = :accountId',
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

  private async setArchived(accountId: string, clientId: string, archived: boolean): Promise<void> {
    const options = {
      update: 'SET #archived = :archived',
      expressionNames: { '#archived': 'archived' },
      expressionValues: { ':archived': { BOOL: archived } },
    };

    const key = toDynamoKey(accountId, { id: clientId });
    await this.dynamo.updateItem(tableName, key, options);
  }
}
