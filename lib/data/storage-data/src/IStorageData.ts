import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IStorage {
  etag?: string;
  data: any;
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

export interface IStorageData extends IDataSource {
  get(accountId: string, subscriptionId: string, storageId: string): Promise<IStorage>;
  list(
    accountId: string,
    subscriptionId: string,
    storageId: string,
    options?: IListStorageOptions
  ): Promise<IListStorageResult>;
  set(accountId: string, subscriptionId: string, storageId: string, storage: IStorage): Promise<IStorage>;
  delete(
    accountId: string,
    subscriptionId: string,
    storageId: string,
    recursive: boolean,
    etag?: string
  ): Promise<void>;
}
