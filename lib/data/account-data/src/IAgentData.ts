import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IAccessEntry {
  resource: string;
  action: string;
}

export interface IAccessEntryWithAllow extends IAccessEntry {
  allow: boolean;
}

export interface IIdentity {
  issuerId: string;
  subject: string;
}

export interface IPermissions {
  allow: IAccessEntry[];
}

export interface IAgent {
  id?: string;
  identities?: IIdentity[];
  access?: IPermissions;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAgentData extends IDataSource {
  init(accountId: string, agentId: string, jwtSecret: string): Promise<void>;
  resolve(accountId: string, agentId: string): Promise<string>;
  get(accountId: string, identity: IIdentity): Promise<IAgent>;
}
