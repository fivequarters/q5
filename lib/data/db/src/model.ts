export interface IRdsCredentials {
  resourceArn: string;
  secretArn: string;
}

export interface IStatementOptions {
  transactionId?: string;
}

export interface ITags {
  [key: string]: string;
}

export interface ITagsWithVersion {
  tags: ITags;
  version?: number;
}

export interface IListRequest {
  accountId: string;
  subscriptionId: string;
  idPrefix?: string;
  tags?: ITags;
  limit?: number;
  next?: string;
}

export interface IEntityKey {
  accountId: string;
  subscriptionId: string;
  id: string;
}

export interface IEntityKeyWithMetadata extends IEntityKey {
  tags: ITags;
  version?: number;
  expires?: number;
}

export interface IEntity extends IEntityKeyWithMetadata {
  data: object;
}

export interface IListResponse {
  items: IEntityKeyWithMetadata[];
  next?: string;
}

export interface IIntegrationCreateRequest extends IEntity {}

export interface IIntegration extends IEntity {
  version: number;
}

export interface IConnectorCreateRequest extends IEntity {}

export interface IConnector extends IEntity {
  version: number;
}

export interface IStorageItem extends IEntity {}

export interface IOperation extends IEntity {
  data: object;
  expires?: number;
}

export interface IQueryOptions {
  filterExpired?: boolean;
  prefixMatchId?: boolean;
  upsert?: boolean;
}

export interface ITagParams {
  key: string;
  value?: string;
  version?: number;
}
