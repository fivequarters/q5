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
  return crypto
    .createHash('sha1')
    .update(value)
    .digest('hex');
}

function getEtag(value: string): string {
  return hash(stringify(value));
}

function isObject(value: any) {
  return !Array.isArray(value) && typeof value === 'object' && value !== null;
}

function getStorageFromPath(storage: any, storageId: string, storagePath: string) {
  storage = storage || {};

  const storagePaths = storagePath.split('/').filter(path => path);
  let current = storage;
  while (storagePaths.length) {
    const currentPath = storagePaths.shift() as string;
    if (!current[currentPath]) {
      throw StorageDataException.noStorage(storageId, storagePath);
    }
    current = current[currentPath];
  }
  return current;
}

function setStorageFromPath(storage: any, data: any, storagePath: string) {
  storage = storage || {};
  if (!isObject(storage)) {
    storage = {};
  }

  const storagePaths = storagePath.split('/').filter(path => path);
  let current = storage;
  while (storagePaths.length > 1) {
    const currentPath = storagePaths.shift() as string;
    if (!isObject(current[currentPath])) {
      current[currentPath] = {};
    }
    current = current[currentPath];
  }
  current[storagePaths[0]] = data;
  return storage;
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
    storageId: string,
    storagePath?: string
  ): Promise<IStorage> {
    const storage = await this.getStorage(accountId, subscriptionId, storageId, true, storagePath);

    if (storagePath) {
      storage.data = getStorageFromPath(storage.data, storageId, storagePath);
      storage.etag = getEtag(storage.data);
    }

    return storage as IStorage;
  }

  public async list(
    accountId: string,
    subscriptionId: string,
    options?: IListStorageOptions
  ): Promise<IListStorageResult> {
    return this.storageTable.list(accountId, subscriptionId, options);
  }

  public async set(
    accountId: string,
    subscriptionId: string,
    storageId: string,
    storage: IStorage,
    storagePath?: string
  ): Promise<IStorage> {
    if (!storage || !storage.data) {
      throw StorageDataException.missingData(storageId, storagePath);
    }

    if (!storagePath) {
      const etag = await this.setStorage(accountId, subscriptionId, storageId, storage);
      return { etag, data: storage.data };
    }

    const existing = await this.getStorage(accountId, subscriptionId, storageId, false, storagePath);
    if (storage.etag) {
      const data = getStorageFromPath(existing.data, storageId, storagePath);
      if (storage.etag !== getEtag(data)) {
        throw StorageDataException.storageConflict(storageId, true, storage.etag, storagePath);
      }
    }

    existing.data = setStorageFromPath(existing.data, storage.data, storagePath);
    await this.setStorage(accountId, subscriptionId, storageId, existing as IStorage);

    return { etag: getEtag(storage.data), data: storage.data };
  }

  public async delete(
    accountId: string,
    subscriptionId: string,
    storageId: string,
    etag?: string,
    storagePath?: string
  ): Promise<void> {
    if (!storagePath) {
      await this.storageTable.delete(accountId, subscriptionId, storageId, etag);
      return;
    }

    const storage = await this.getStorage(accountId, subscriptionId, storageId, true, storagePath);
    const data = getStorageFromPath(storage.data, storageId, storagePath);
    if (etag && etag !== getEtag(data)) {
      throw StorageDataException.storageConflict(storageId, false, etag, storagePath);
    }

    storage.data = setStorageFromPath(storage.data, undefined, storagePath);
    await this.setStorage(accountId, subscriptionId, storageId, storage as IStorage);
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
    storagePath: string = ''
  ) {
    try {
      const storage = await this.storageTable.get(accountId, subscriptionId, storageId);
      const json = storage.gzip ? await unzip(storage.data) : Buffer.from(storage.data, 'base64').toString();
      return { data: JSON.parse(json), etag: storage.etag };
    } catch (error) {
      if (error.code === 'noStorage') {
        if (throwIfNotFound) {
          throw StorageDataException.noStorage(storageId, storagePath);
        }
        return { data: {} };
      }
      throw error;
    }
  }
}
