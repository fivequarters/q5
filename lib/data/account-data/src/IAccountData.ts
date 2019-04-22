import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IAccount {
  id?: string;
  displayName?: string;
  primaryEmail?: string;
}

export interface IListAccountsOptions {
  next?: string;
  limit?: number;
  displayNameContains?: string;
  primaryEmailContains?: string;
}

export interface IListAccountsResult {
  next?: string;
  items: IAccount[];
}

export interface IAccountData extends IDataSource {
  add(account: IAccount): Promise<IAccount>;
  get(accountId: string): Promise<IAccount>;
  list(options?: IListAccountsOptions): Promise<IListAccountsResult>;
  update(account: IAccount): Promise<IAccount>;
  delete(accountId: string): Promise<void>;
}
