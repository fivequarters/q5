import crypto from 'crypto';
import { DataSource } from '@5qtrs/data';
import { stringify } from '@5qtrs/json-stable';
import { zip, unzip } from '@5qtrs/gzip';
import {
  IStorageData,
  IStorage,
  IListStorageOptions,
  IListStorageResult,
  StorageDataException,
} from '@5qtrs/storage-data';
import { StorageDataAwsConfig } from './StorageDataAwsConfig';
import { StorageTable } from './tables/StorageTable';

// ------------------
// Internal Functions
// ------------------

function hash(value: string): string {
  return crypto.createHash('sha1').update(value).digest('hex');
}

function getEtag(value: string): string {
  return hash(stringify(value));
}

function isObject(value: any) {
  return !Array.isArray(value) && typeof value === 'object' && value !== null;
}

// ----------------
// Exported Classes
// ----------------

export class StorageData extends DataSource implements IStorageData {
  public static async create(config: StorageDataAwsConfig, storageTable: StorageTable) {
    return new StorageData(config, storageTable);
  }
  private config: StorageDataAwsConfig;
  private storageTable: StorageTable;

  private constructor(config: StorageDataAwsConfig, storageTable: StorageTable) {
    super([storageTable]);
    this.config = config;
    this.storageTable = storageTable;
  }

  public async get(
    accountId: string,
    subscriptionId: string,
    storageId: string
  ): Promise<IStorage> {
    const storage = await this.getStorage(accountId, subscriptionId, storageId, true);

    return storage as IStorage;
  }

  public async list(
    accountId: string,
    subscriptionId: string,
    storageId: string,
    options?: IListStorageOptions
  ): Promise<IListStorageResult> {
    return this.storageTable.list(accountId, subscriptionId, storageId, options);
  }

  public async set(
    accountId: string,
    subscriptionId: string,
    storageId: string,
    storage: IStorage
  ): Promise<IStorage> {
    if (!storage || !storage.data) {
      throw StorageDataException.missingData(storageId);
    }

    const etag = await this.setStorage(accountId, subscriptionId, storageId, storage);
    return { etag, data: storage.data };
  }

  public async delete(
    accountId: string,
    subscriptionId: string,
    storageId: string,
    recursive: boolean,
    etag?: string,
  ): Promise<void> {
    await this.storageTable.delete(accountId, subscriptionId, storageId, recursive, etag);
    return;
  }

  private async setStorage(accountId: string, subscriptionId: string, storageId: string, storage: IStorage) {
    const gzip = this.config.gzipEnabled;
    const json = stringify(storage.data);
    const etag = hash(json);
    const data = gzip ? await zip(json) : Buffer.from(json).toString('base64');
    const entry = { id: storageId, data, etag, gzip };
    await this.storageTable.set(accountId, subscriptionId, entry, storage.etag);
    return etag;
  }

  private async getStorage(
    accountId: string,
    subscriptionId: string,
    storageId: string,
    throwIfNotFound: boolean = true,
  ) {
    try {
      const storage = await this.storageTable.get(accountId, subscriptionId, storageId);
      const json = storage.gzip ? await unzip(storage.data) : Buffer.from(storage.data, 'base64').toString();
      return { data: JSON.parse(json), etag: storage.etag };
    } catch (error) {
      if (error.code === 'noStorage') {
        if (throwIfNotFound) {
          throw StorageDataException.noStorage(storageId);
        }
        return { data: {} };
      }
      throw error;
    }
  }
}
