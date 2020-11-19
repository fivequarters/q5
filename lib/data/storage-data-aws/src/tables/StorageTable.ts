import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { StorageDataException } from '@5qtrs/storage-data';
import { StorageDataAwsConfig } from '../StorageDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const delimiter = ':';
const table: IAwsDynamoTable = {
  name: 'storage',
  attributes: { accountIdSubscriptionId: 'S', storageId: 'S' },
  keys: ['accountIdSubscriptionId', 'storageId'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(storageId: string, context: string[]) {
  return {
    accountIdSubscriptionId: { S: context.join(delimiter) },
    storageId: { S: storageId },
  };
}

function toItem(storageEntry: IStorage, context: string[]) {
  const item: any = toKey(storageEntry.id, context);
  item.etag = { S: storageEntry.etag };
  item.gzip = { BOOL: storageEntry.gzip };
  item.data = { S: storageEntry.data };
  return item;
}

function fromItem(item: any): IStorage | IStorageShort {
  return item.data
    ? {
        id: item.storageId.S,
        etag: item.etag.S,
        gzip: item.gzip.BOOL,
        data: item.data.S,
      }
    : {
        storageId: item.storageId.S,
      };
}

function onNoStorage(id: string) {
  throw StorageDataException.noStorage(id);
}

function onStorageConflict(isUpdate: boolean, etag: string) {
  return (itemOrId: IStorage | string) => {
    const id = isUpdate ? (itemOrId as IStorage).id : (itemOrId as string);
    throw StorageDataException.storageConflict(id, isUpdate, etag);
  };
}

function getUpdateOrDeleteOptions(accountId: string, subscriptionId: string, isUpdate: boolean, etag: string = '') {
  const conditions: string[] = [];
  const expressionValues: any = {};
  const expressionNames: any = {};

  if (etag) {
    conditions.push('#etag = :etag');
    expressionNames['#etag'] = 'etag';
    expressionValues[':etag'] = { S: etag };
  }

  const options = {
    onConditionCheckFailed: etag ? onStorageConflict(isUpdate, etag) : onNoStorage,
    context: [accountId, subscriptionId],
    conditions: conditions.length ? conditions : undefined,
    expressionValues: conditions.length ? expressionValues : undefined,
    expressionNames: conditions.length ? expressionNames : undefined,
  };

  return options;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IStorage {
  id: string;
  etag: string;
  gzip: boolean;
  data: string;
}

export interface IStorageShort {
  storageId: string;
}

export interface IListStorageOptions {
  next?: string;
  limit?: number;
}

export interface IListStorageResult {
  next?: string;
  items: IStorageShort[];
}

// ----------------
// Exported Classes
// ----------------

export class StorageTable extends AwsDynamoTable {
  public static async create(config: StorageDataAwsConfig, dynamo: AwsDynamo) {
    return new StorageTable(config, dynamo);
  }
  private config: StorageDataAwsConfig;

  private constructor(config: StorageDataAwsConfig, dynamo: AwsDynamo) {
    super(table, dynamo);
    this.config = config;
  }

  public async get(accountId: string, subscriptionId: string, storageId: string): Promise<IStorage> {
    const options = { onNotFound: onNoStorage, context: [accountId, subscriptionId] };
    return this.getItem(storageId, options);
  }

  public async list(
    accountId: string,
    subscriptionId: string,
    storageId: string,
    options?: IListStorageOptions
  ): Promise<IListStorageResult> {
    const keyConditions = ['accountIdSubscriptionId = :accountIdSubscriptionId'];
    const expressionValues: any = { ':accountIdSubscriptionId': { S: [accountId, subscriptionId].join(delimiter) } };

    if (storageId.length > 0) {
      keyConditions.push('begins_with(storageId, :storageIdPrefix)');
      expressionValues[':storageIdPrefix'] = { S: storageId };
    }

    const queryOptions = {
      next: options && options.next ? options.next : undefined,
      limit: options && options.limit ? options.limit : undefined,
      expressionValues,
      keyConditions,
      projection: 'accountIdSubscriptionId, storageId',
    };

    return this.queryTable(queryOptions);
  }

  public async set(accountId: string, subscriptionId: string, storage: IStorage, etag: string = ''): Promise<void> {
    const options = getUpdateOrDeleteOptions(accountId, subscriptionId, true, etag);
    await this.putItem(storage, options);
  }

  public async delete(
    accountId: string,
    subscriptionId: string,
    storageId: string,
    recursive: boolean,
    etag: string = ''
  ): Promise<void> {
    if (recursive) {
      while (true) {
        const list = await this.list(accountId, subscriptionId, storageId, { limit: 10 });
        if (list.items && list.items.length > 0) {
          await Promise.all(list.items.map((s) => this.delete(accountId, subscriptionId, s.storageId, false)));
        }
        if (!list.next) {
          break;
        }
      }
    } else {
      const options = getUpdateOrDeleteOptions(accountId, subscriptionId, false, etag);
      await this.deleteItem(storageId, options);
    }
  }
}
