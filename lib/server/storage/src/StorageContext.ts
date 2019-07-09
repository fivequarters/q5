import { IStorageDataContextFactory, IStorageDataContext } from '@5qtrs/storage-data';
import { IConfig } from '@5qtrs/config';
import { StorageConfig } from './StorageConfig';
import { Storage } from './Storage';

// ----------------
// Exported Classes
// ----------------

export class StorageContext {
  private dataContext: IStorageDataContext;
  private storageConfig: StorageConfig;
  private storageProp: Storage;

  private constructor(storageConfig: StorageConfig, dataContext: IStorageDataContext, storage: Storage) {
    this.storageConfig = storageConfig;
    this.dataContext = dataContext;
    this.storageProp = storage;
  }

  public static async create(config: IConfig, dataContextFactory: IStorageDataContextFactory) {
    const storageConfig = await StorageConfig.create(config);
    const dataContext = await dataContextFactory.create(storageConfig);
    const storage = await Storage.create(storageConfig, dataContext);
    return new StorageContext(storageConfig, dataContext, storage);
  }

  public get storage() {
    return this.storageProp;
  }
}
