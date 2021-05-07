import { EntityConstructorArgument } from './entity';

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

export interface IEntityKey {
  accountId: string;
  subscriptionId: string;
  id: string;
}

export interface IEntityKeyWithMetadata extends IEntityKey, IEntityKeyMetadata {}

export interface IEntity extends IEntityKeyWithMetadata {
  data: object;
}
export interface IEntityKeyMetadata {
  tags: ITags;
  version?: number;
  expires?: Date;
}

export interface IEntityKeyGet extends IEntityKey {}
export interface IEntityKeyList extends IEntityKeyPrefix, IEntityKeyMetadata {
  limit?: number;
  next?: string;
}
export interface IEntityKeyDelete extends Omit<Partial<IEntity>, keyof IEntityKeyPrefix>, IEntityKeyPrefix {}
export interface IEntityKeyCreate extends IEntity {}
export interface IEntityKeyUpdate extends IEntity {}
export interface IEntityKeyTags
  extends Omit<Partial<IEntity>, keyof IEntityKey | keyof IEntityKeyMetadata>,
    IEntityKey,
    IEntityKeyWithMetadata {}
export interface IEntityKeyTag
  extends Omit<Partial<IEntity>, keyof IEntityKey | keyof IEntityKeyMetadata>,
    IEntityKey,
    IEntityKeyWithMetadata {
  tagKey: string;
  tagValue?: string;
}

export type PartialApply<T, U> = Partial<Omit<T, keyof U>> & U;

export type EntityKeyGet<T extends IEntity> = PartialApply<T, IEntityKeyGet>;
export type EntityKeyList<T extends IEntity> = PartialApply<T, IEntityKeyList>;
export type EntityKeyDelete<T extends IEntity> = PartialApply<T, IEntityKeyDelete>;
export type EntityKeyCreate<T extends IEntity> = PartialApply<T, IEntityKeyCreate>;
export type EntityKeyUpdate<T extends IEntity> = PartialApply<T, IEntityKeyUpdate>;
export type EntityKeyTags<T extends IEntity> = PartialApply<T, IEntityKeyTags>;
export type EntityKeyTag<T extends IEntity> = PartialApply<T, IEntityKeyTag>;
export type EntityKeyParams<T extends IEntity> =
  | EntityKeyGet<T>
  | EntityKeyList<T>
  | EntityKeyDelete<T>
  | EntityKeyCreate<T>
  | EntityKeyUpdate<T>
  | EntityKeyTags<T>
  | EntityKeyTag<T>;

export interface IEntityKeyPrefix extends Omit<IEntityKey, 'id'> {
  id?: string;
  idPrefix?: string;
}

export interface IListResponse<T extends IEntity> {
  items: T[];
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

export interface IOperation extends IEntity {}

export interface IQueryOptions {
  filterExpired?: boolean;
  prefixMatchId?: boolean;
  upsert?: boolean;
}

type OptionalKeysList<T> = {
  [K in keyof T]-?: undefined extends { [K2 in keyof T]: K2 }[K] ? K : never;
}[keyof T];

export type OptionalKeysOnly<T> = {
  [K in OptionalKeysList<EntityConstructorArgument>]-?: NonNullable<EntityConstructorArgument[K]>;
};
