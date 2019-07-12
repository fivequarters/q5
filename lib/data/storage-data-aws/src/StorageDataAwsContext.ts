import { DataSource } from '@5qtrs/data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { IStorageDataContext, IStorageData } from '@5qtrs/storage-data';
import { StorageData } from './StorageData';
import { StorageTable } from './tables/StorageTable';
import { StorageDataAwsConfig } from './StorageDataAwsConfig';

// ----------------
// Exported Classes
// ----------------

export class StorageDataAwsContext extends DataSource implements IStorageDataContext {
  public static async create(config: StorageDataAwsConfig, dynamo: AwsDynamo) {
    const storageTable = await StorageTable.create(config, dynamo);
    const storage = await StorageData.create(config, storageTable);
    return new StorageDataAwsContext(storage);
  }

  private constructor(storage: StorageData) {
    super([storage]);
    this.storage = storage;
  }

  private storage: StorageData;

  public get storageData(): IStorageData {
    return this.storage;
  }
}
