import { IDataSource } from '@5qtrs/data';
import { IAgent } from './IAgentData';

// -------------------
// Exported Interfaces
// -------------------

export enum UserInclude {
  all = 'all',
}

export interface IUser extends IAgent {
  id?: string;
  firstName?: string;
  lastName?: string;
  primaryEmail?: string;
}

export interface IListUsersOptions {
  next?: string;
  limit?: number;
  include?: UserInclude;
  exact?: boolean;
  nameContains?: string;
  primaryEmailContains?: string;
  issuerContains?: string;
  subjectContains?: string;
}

export interface IListUsersResult {
  next?: string;
  items: IUser[];
}

export interface IUserData extends IDataSource {
  add(accountId: string, user: IUser): Promise<IUser>;
  get(accountId: string, userId: string): Promise<IUser>;
  list(accountId: string, options?: IListUsersOptions): Promise<IListUsersResult>;
  update(accountId: string, user: IUser): Promise<IUser>;
  delete(accountId: string, userId: string): Promise<void>;
}
