import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsAccount {
  id: string;
  name: string;
  role: string;
}

export interface IListOpsAccountOptions {
  next?: string;
  limit?: number;
}

export interface IListOpsAccountResult {
  next?: string;
  items: IOpsAccount[];
}

export interface IOpsAccountData extends IDataSource {
  exists(account: IOpsAccount): Promise<boolean>;
  add(account: IOpsAccount): Promise<void>;
  get(accountName: string): Promise<IOpsAccount>;
  list(options?: IListOpsAccountOptions): Promise<IListOpsAccountResult>;
  listAll(): Promise<IOpsAccount[]>;
}
