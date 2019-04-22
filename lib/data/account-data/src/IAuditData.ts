import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface IAuditEntry {
  accountId: string;
  issuerId: string;
  subject: string;
  action: string;
  resource: string;
  authorized: boolean;
  data?: object;
  timestamp?: string;
}

export interface IListAuditEntriesOptions {
  next?: string;
  limit?: number;
  from?: Date;
  to?: Date;
  resourceStartsWith?: string;
  actionContains?: string;
  issuer?: string;
  subject?: string;
}

export interface IListAuditEntriesResult {
  next?: string;
  items: IAuditEntry[];
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAuditData extends IDataSource {
  add(user: IAuditEntry): Promise<void>;
  list(accountId: string, options?: IListAuditEntriesOptions): Promise<IListAuditEntriesResult>;
}
