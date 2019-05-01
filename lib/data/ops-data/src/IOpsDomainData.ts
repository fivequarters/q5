import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsDomain {
  name: string;
  accountName: string;
  nameServers?: string[];
}

export interface IListOpsDomainOptions {
  next?: string;
  limit?: number;
}

export interface IListOpsDomainResult {
  next?: string;
  items: IOpsDomain[];
}

export interface IOpsDomainData extends IDataSource {
  add(domain: IOpsDomain): Promise<void>;
  get(domainName: string): Promise<IOpsDomain>;
  list(options?: IListOpsDomainOptions): Promise<IListOpsDomainResult>;
}
