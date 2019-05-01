import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsNetwork {
  name: string;
  account: string;
  region: string;
}

export interface IListOpsNetworkOptions {
  next?: string;
  limit?: number;
}

export interface IListOpsNetworkResult {
  next?: string;
  items: IOpsNetwork[];
}

export interface IOpsNetworkData extends IDataSource {
  add(account: IOpsNetwork): Promise<void>;
  get(accountName: string): Promise<IOpsNetwork>;
  list(options?: IListOpsNetworkOptions): Promise<IListOpsNetworkResult>;
}
