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

export interface IListResponseItem extends IEntityKey {
  tags?: ITags;
}

export interface IListResponse {
  items: IListResponseItem[];
  next?: string;
}

export interface IIntegration extends IEntityKey {
  tags?: ITags;
  definition: object;
}

export interface IConnector extends IEntityKey {
  tags?: ITags;
  definition: object;
}

export interface IStorageItem extends IEntityKey {
  tags?: ITags;
  expires?: number;
  etag?: string;
  data: object;
}

export interface IOperation extends IEntityKey {
  tags?: ITags;
  expires: number;
  data: object;
}
