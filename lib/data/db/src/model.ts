export interface IRdsCredentials {
  resourceArn: string;
  secretArn: string;
}

//--------------------------------
// EntityKey Components
//--------------------------------
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

export interface IEntityKeyPrefix extends Omit<IEntityKey, 'id'> {
  id?: string;
  idPrefix?: string;
}

export interface ITags {
  [key: string]: string;
}

export interface ITagsWithVersion {
  tags: ITags;
  version?: number;
}
//--------------------------------
// EntityKey Generic Interfaces
//--------------------------------
export interface IEntityKeyGet extends IEntityKey {}
export interface IEntityKeyList extends IEntityKeyPrefix, IEntityKeyMetadata {
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

//--------------------------------
// EntityKey Params
//--------------------------------
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

export interface IListResponse<T extends IEntity> {
  items: T[];
  next?: string;
}

//--------------------------------
// IEntity Extensions
//--------------------------------

export interface IIntegration extends IEntity {
  version: number;
}

export interface IConnectorCreateRequest extends IEntity {}

export interface IConnector extends IEntity {
  version: number;
}

export interface IStorageItem extends IEntity {}

export interface IOperation extends IEntity {}

//--------------------------------
// Utilities
//--------------------------------

type OptionalKeysList<T> = {
  [K in keyof T]-?: undefined extends { [K2 in keyof T]: K2 }[K] ? K : never;
}[keyof T];

type RequiredKeysList<T> = {
  [K in keyof T]-?: undefined extends { [K2 in keyof T]: K2 }[K] ? never : K;
}[keyof T];

export type OptionalKeysOnly<T> = {
  [K in OptionalKeysList<T>]-?: NonNullable<T[K]>;
};

export type RequiredKeysOnly<T> = {
  [K in RequiredKeysList<T>]: NonNullable<T[K]>;
};

//--------------------------------
// Entity Constructors Arguments, and Mergeables
//--------------------------------

export interface EntityConstructorArgument
  extends DefaultQueryOptions,
    DefaultStatementOptions,
    DefaultParameterOptions {
  entityType: EntityType;
}

export interface EntityConstructorArgumentWithDefaults
  extends defaultConstructorArguments,
    Omit<EntityConstructorArgument, keyof defaultConstructorArguments> {}

export interface DefaultQueryOptions {
  upsert?: boolean;
  filterExpired?: boolean;
  prefixMatchId?: boolean;
  listLimit?: number;
}
export interface MergedQueryOptions
  extends Pick<defaultConstructorArguments, keyof DefaultQueryOptions>,
    Partial<Omit<OptionalKeysOnly<DefaultQueryOptions>, keyof defaultConstructorArguments>>,
    RequiredKeysOnly<DefaultQueryOptions> {}
export interface InputQueryOptions extends Partial<DefaultQueryOptions> {}
export interface FinalQueryOptions extends Omit<InputQueryOptions, keyof MergedQueryOptions>, MergedQueryOptions {}

export interface DefaultStatementOptions {}
export interface MergedStatementOptions /*
 uncomment the below line once `defaultConstructorArguments` includes an item from `DefaultStatementOptions`
  // Pick<defaultConstructorArguments, keyof DefaultStatementOptions>,
 */
  extends Partial<Omit<OptionalKeysOnly<DefaultStatementOptions>, keyof defaultConstructorArguments>>,
    RequiredKeysOnly<DefaultStatementOptions> {}
export interface InputStatementOptions extends Partial<DefaultStatementOptions> {}
export interface FinalStatementOptions
  extends Omit<InputStatementOptions, keyof MergedStatementOptions>,
    MergedStatementOptions {}

export interface DefaultParameterOptions {
  expires?: number;
}
export interface MergedParameterOptions /*
 uncomment the below line once `defaultConstructorArguments` includes an item from `DefaultParameterOptions`
  // Pick<defaultConstructorArguments, keyof DefaultParameterOptions>,
 */
  extends Partial<Omit<OptionalKeysOnly<DefaultParameterOptions>, keyof defaultConstructorArguments>>,
    RequiredKeysOnly<DefaultParameterOptions> {}

export interface defaultConstructorArguments {
  upsert: boolean;
  filterExpired: boolean;
  prefixMatchId: boolean;
  listLimit: number;
}

export enum EntityType {
  Integration = 'integration',
  Connector = 'connector',
  Operation = 'operation',
  Storage = 'storage',
}
