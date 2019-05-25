import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { AccountDataException } from '@5qtrs/account-data';
import { AccountDataAwsConfig } from '../AccountDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'client',
  attributes: { accountId: 'S', clientId: 'S' },
  keys: ['accountId', 'clientId'],
  archive: true,
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(clientId: string, accountId: string) {
  return {
    accountId: { S: accountId },
    clientId: { S: clientId },
  };
}

function toItem(client: IClient, accountId: string) {
  const item: any = toKey(client.id, accountId);
  item.displayName = client.displayName ? { S: client.displayName } : undefined;
  return item;
}

function fromItem(item: any): IClient {
  return {
    id: item.clientId.S,
    displayName: item.displayName ? item.displayName.S : undefined,
  };
}

function getConfig(config: AccountDataAwsConfig) {
  return () => ({
    defaultLimit: config.clientDefaultLimit,
    maxLimit: config.clientMaxLimit,
  });
}

function onClientAlreadyExist(client: IClient) {
  throw AccountDataException.agentAlreadyExists(client.id);
}

function onNoClient(clientId: string) {
  throw AccountDataException.noAgent(clientId);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IClient {
  id: string;
  displayName?: string;
}

export interface IListBaseClientsOptions {
  next?: string;
  limit?: number;
  displayNameContains?: string;
  exact?: boolean;
}

export interface IListClientsResult {
  next?: string;
  items: IClient[];
}

// ----------------
// Exported Classes
// ----------------

export class ClientTable extends AwsDynamoTable {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    return new ClientTable(config, dynamo);
  }

  private constructor(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
  }

  public async add(accountId: string, client: IClient): Promise<void> {
    const options = { onConditionCheckFailed: onClientAlreadyExist, context: accountId };
    return this.addItem(client, options);
  }

  public async get(accountId: string, clientId: string): Promise<IClient> {
    const options = { onNotFound: onNoClient, context: accountId };
    return this.getItem(clientId, options);
  }

  public async getAll(accountId: string, clientIds: string[]): Promise<IClient[]> {
    const options = { onNotFound: onNoClient, context: accountId };
    return this.getAllItems(clientIds, options);
  }

  public async list(accountId: string, options?: IListBaseClientsOptions): Promise<IListClientsResult> {
    const filters = [];
    const keyConditions = ['accountId = :accountId'];
    const expressionValues: any = { ':accountId': { S: accountId } };
    const exact = options && options.exact === true;

    if (options) {
      if (options.displayNameContains) {
        filters.push(exact ? 'displayName = :displayName' : 'contains(displayName, :displayName)');
        expressionValues[':displayName'] = { S: options.displayNameContains };
      }
    }

    const queryOptions = {
      next: options && options.next ? options.next : undefined,
      limit: options && options.limit ? options.limit : undefined,
      expressionValues,
      keyConditions,
      filters,
    };

    return this.queryTable(queryOptions);
  }

  public async update(accountId: string, client: IClient): Promise<IClient> {
    const sets = [];
    const expressionValues: any = {};

    if (client.displayName) {
      sets.push('displayName = :displayName');
      expressionValues[':displayName'] = { S: client.displayName };
    }

    if (!sets.length) {
      return this.get(accountId, client.id);
    }

    const options = {
      sets,
      expressionValues,
      context: accountId,
      onConditionCheckFailed: onNoClient,
    };

    return this.updateItem(client.id, options);
  }

  public async delete(accountId: string, clientId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoClient, context: accountId };
    return this.deleteItem(clientId, options);
  }

  public async archive(accountId: string, clientId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoClient, context: accountId };
    await this.archiveItem(clientId, options);
  }

  public async unarchive(accountId: string, clientId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoClient, context: accountId };
    await this.unarchiveItem(clientId, options);
  }
}
