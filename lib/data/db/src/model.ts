export interface IStatementOptions {
  transactionId?: string;
}

export interface ITags {
  [key: string]: string;
}

export interface IListRequest {
  accountId: string;
  subscriptionId: string;
  tags?: ITags;
  limit?: number;
  next?: string;
}

export interface IEntityKey {
  accountId: string;
  subscriptionId: string;
  id: string;
}

export interface IEntityKeyWithTags extends IEntityKey {
  tags?: ITags;
}

export interface IEntityBase extends IEntityKeyWithTags {
  data: object;
}

export interface IListResponse {
  items: IEntityKeyWithTags[];
  next?: string;
}

export type IIntegration = IEntityBase;

export type IConnector = IEntityBase;

export interface IStorageItem extends IEntityBase {
  expires?: number;
  etag?: string;
}

export interface IOperation extends IEntityBase {
  expires: number;
}
