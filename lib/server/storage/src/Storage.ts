import { IStorageDataContext, IStorage, IListStorageOptions, IListStorageResult } from '@5qtrs/storage-data';
import { StorageConfig } from './StorageConfig';
import { ResolvedAgent } from '@5qtrs/account';

// ----------------
// Exported Classes
// ----------------

export class Storage {
  private config: StorageConfig;
  private dataContext: IStorageDataContext;

  private constructor(config: StorageConfig, dataContext: IStorageDataContext) {
    this.config = config;
    this.dataContext = dataContext;
  }

  public static async create(config: StorageConfig, dataContext: IStorageDataContext) {
    return new Storage(config, dataContext);
  }

  public async get(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    subscriptionId: string,
    storageId: string
  ): Promise<IStorage> {
    return this.dataContext.storageData.get(accountId, subscriptionId, storageId);
  }

  public async list(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    subscriptionId: string,
    storageId: string,
    options?: IListStorageOptions
  ): Promise<IListStorageResult> {
    return this.dataContext.storageData.list(accountId, subscriptionId, storageId, options);
  }

  public async set(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    subscriptionId: string,
    storageId: string,
    storage: IStorage,
  ): Promise<IStorage> {
    return this.dataContext.storageData.set(accountId, subscriptionId, storageId, storage);
  }

  public async delete(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    subscriptionId: string,
    storageId: string,
    recursive: boolean,
    etag: string = '',
  ): Promise<void> {
    return this.dataContext.storageData.delete(accountId, subscriptionId, storageId, recursive, etag);
  }
}
