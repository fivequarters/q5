import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsDomain {
  domainName: string;
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
  exists(domain: IOpsDomain): Promise<boolean>;
  add(domain: IOpsDomain): Promise<IOpsDomain>;
  get(domainName: string): Promise<IOpsDomain>;
  list(options?: IListOpsDomainOptions): Promise<IListOpsDomainResult>;
  listAll(): Promise<IOpsDomain[]>;
}
