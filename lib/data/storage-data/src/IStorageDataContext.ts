import { IDataSource } from '@5qtrs/data';
import { IConfig } from '@5qtrs/config';
import { IStorageData } from './IStorageData';

// -------------------
// Exported Interfaces
// -------------------

export interface IStorageDataContext extends IDataSource {
  readonly storageData: IStorageData;
}

export interface IStorageDataContextFactory {
  create(config: IConfig): Promise<IStorageDataContext>;
}
