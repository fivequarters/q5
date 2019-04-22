import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IAccessEntry {
  resource: string;
  action: string;
}

export interface IIdentity {
  iss: string;
  sub: string;
}

export interface IAgent {
  id?: string;
  identities?: IIdentity[];
  access?: {
    allow?: IAccessEntry[];
  };
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAgentData extends IDataSource {
  init(accountId: string, agentId: string, jwtSecret: string): Promise<void>;
  resolve(accountId: string, agentId: string): Promise<string>;
  get(accountId: string, identity: IIdentity): Promise<IAgent>;
}
