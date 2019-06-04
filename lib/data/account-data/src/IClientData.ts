import { IDataSource } from '@5qtrs/data';
import { IAgent } from './IAgentData';

// -------------------
// Exported Interfaces
// -------------------

export enum ClientInclude {
  all = 'all',
}

export interface IClient extends IAgent {
  displayName?: string;
}

export interface IListClientsOptions {
  next?: string;
  limit?: number;
  include?: ClientInclude;
  displayNameContains?: string;
  issuerId?: string;
  subject?: string;
}

export interface IListClientsResult {
  next?: string;
  items: IClient[];
}

export interface IClientData extends IDataSource {
  add(accountId: string, client: IClient): Promise<IClient>;
  get(accountId: string, clientId: string): Promise<IClient>;
  list(accountId: string, options?: IListClientsOptions): Promise<IListClientsResult>;
  update(accountId: string, client: IClient): Promise<IClient>;
  delete(accountId: string, clientId: string): Promise<void>;
}
