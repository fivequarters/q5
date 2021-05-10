import moment from 'moment';
import * as AWS from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { RDSDataService } from 'aws-sdk';
import { Metadata, SqlRecords } from 'aws-sdk/clients/rdsdataservice';

class CustomError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface IRds {
  NotFoundError: typeof CustomError;
  ConflictError: typeof CustomError;
  purgeExpiredItems: () => Promise<boolean>;
  ensureConnection: () => Promise<{ rdsSdk: AWS.RDSDataService; rdsCredentials: IRdsCredentials }>;
  executeStatement: (
    sql: string,
    objectParameters?: { [key: string]: any },
    statementOptions?: FinalStatementOptions
  ) => Promise<PromiseResult<RDSDataService.ExecuteStatementResponse, AWS.AWSError>>;
  createParameterArray: (parameters: { [key: string]: any }) => RDSDataService.SqlParametersList;
  createTransaction: () => Promise<string>;
  commitTransaction: (transactionId: string) => Promise<string>;
  rollbackTransaction: (transactionId: string) => Promise<string>;
  inTransaction: <T>(func: (daoCollection: IDaoCollection) => T) => Promise<T>;
  ensureRecords: (
    result: RDSDataService.ExecuteStatementResponse
  ) => asserts result is RDSDataService.ExecuteStatementResponse & {
    records: SqlRecords;
    columnMetadata: Metadata;
  };
  DAO: IDaoCollection;
}

export interface IDaoCollection {
  Connector: IEntityDao<IConnector>;
  Integration: IEntityDao<IIntegration>;
  Storage: IEntityDao<IStorageItem>;
  Operation: IEntityDao<IOperation>;
}

export interface IRdsCredentials {
  resourceArn: string;
  secretArn: string;
}

//--------------------------------
// EntityKey Components
//--------------------------------

export interface ITags {
  [key: string]: string;
}

export interface ITagsWithVersion {
  tags: ITags;
  version?: number;
}

// Data needed for any request
export interface IEntityCore {
  accountId: string;
  subscriptionId: string;
}

// Data needed for selects and deletes
interface IEntitySelectAbstract extends IEntityCore {
  tags?: ITags;
  version?: number;
  next?: string;
}
export interface IEntityId extends IEntitySelectAbstract {
  id: string;
}
export interface IEntityPrefix extends IEntitySelectAbstract {
  id?: string;
  idPrefix?: string;
}

// Data needed for inserts
export interface IEntity extends IEntityId {
  tags?: ITags;
  data?: object;
  expires?: moment.Moment;
  expiresDuration?: moment.Duration;
}
export interface IEntityKeyTagSet extends IEntityId {
  tagKey: string;
  tagValue?: string;
}

export interface EntityKeyParams
  extends Partial<IEntity>,
    Partial<IEntityId>,
    Partial<IEntityPrefix>,
    Partial<IEntityKeyTagSet> {}

export interface IListResponse<T extends IEntity> {
  items: T[];
  next?: string;
}

//--------------------------------
// IEntity Extensions
//--------------------------------

export interface IIntegration extends IEntity {}
export interface IConnector extends IEntity {}
export interface IStorageItem extends IEntity {}
export interface IOperation extends IEntity {}
export interface IEntityGeneric extends IIntegration, IConnector, IStorageItem, IOperation {}

//--------------------------------
// Utilities
//--------------------------------

export type OptionalKeysOnly<T> = {
  [K in keyof { [key in keyof T]: T[key] extends undefined ? T[K] : never }]: T[K];
};
export type RequiredKeysOnly<T> = {
  [K in keyof { [key in keyof T]: T[key] extends undefined ? never : T[K] }]: T[K];
};
export type ExcludeIfExists<T, K> = Pick<T, Exclude<keyof T, keyof K>>;
export type PickIfExists<T, K> = Pick<T, Extract<keyof T, keyof K>>;
export type OptionalIntersection<T, K> = PickIfExists<OptionalKeysOnly<T>, OptionalKeysOnly<K>>;
export type RequiredIntersection<T, K> = PickIfExists<RequiredKeysOnly<T>, Required<K>> &
  PickIfExists<RequiredKeysOnly<K>, Required<T>>;
export type Intersection<T, K> = OptionalIntersection<T, K> & RequiredIntersection<T, K>;
export type MergeInner<T, K> = Intersection<T, K>;
export type MergeOuter<T, K> = Intersection<T, K> & ExcludeIfExists<K, T> & ExcludeIfExists<T, K>;
export type MergeRight<T, K> = Intersection<T, K> & ExcludeIfExists<T, K>;
export type MergeLeft<T, K> = Intersection<T, K> & ExcludeIfExists<K, T>;

//--------------------------------
// Entity Constructors Arguments
//--------------------------------

// Queries
export interface DefaultQueryOptions {
  upsert?: boolean;
  filterExpired?: boolean;
  listLimit?: number;
}
export interface MergedQueryOptions extends MergeLeft<DefaultConstructorArguments, DefaultQueryOptions> {}
export interface InputQueryOptions extends Partial<DefaultQueryOptions> {}
export interface FinalQueryOptions extends MergeOuter<InputQueryOptions, MergedQueryOptions> {}

// Statements
export interface DefaultStatementOptions {}
export interface MergedStatementOptions extends MergeLeft<DefaultConstructorArguments, DefaultStatementOptions> {}
export interface InputStatementOptions extends Partial<DefaultStatementOptions> {}
export interface FinalStatementOptions extends MergeOuter<InputStatementOptions, MergedStatementOptions> {}

// Parameters
export interface DefaultParameterOptions {
  expires?: moment.Moment;
  expiresDuration?: moment.Duration;
}
export interface MergedParameterOptions extends MergeLeft<DefaultConstructorArguments, DefaultParameterOptions> {}

// Constructors
export interface DefaultOptions extends DefaultQueryOptions, DefaultParameterOptions, DefaultStatementOptions {}
export interface DefaultConstructorArguments extends DefaultOptions {
  upsert: boolean;
  filterExpired: boolean;
  listLimit: number;
}
export interface InputConstructorArguments extends DefaultOptions {
  entityType: EntityType;
  RDS: IRds;
  transactionId?: string;
}
export interface MergedConstructorArguments
  extends MergeOuter<DefaultConstructorArguments, InputConstructorArguments> {}

export enum EntityType {
  Integration = 'integration',
  Connector = 'connector',
  Operation = 'operation',
  Storage = 'storage',
}

//--------------------------------
// DAO Class Definitions
//--------------------------------

export interface IDAO {
  createTransactional: (transactionId?: string) => this;
}

export interface IEntityDao<ET extends IEntity> extends IDAO {
  sqlToIEntity: <T>(result: RDSDataService.ExecuteStatementResponse) => T[];
  getEntity: (
    params: IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET>;
  getEntityTags: (
    params: IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion>;
  listEntities: (params: IEntityPrefix, queryOptions?: InputQueryOptions) => Promise<IListResponse<ET>>;
  deleteEntity: (
    params: IEntityPrefix,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<boolean>;
  createEntity: (
    params: IEntity,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET>;
  updateEntity: (
    params: IEntity,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET>;
  updateEntityTags: (
    params: IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion>;
  setEntityTag: (
    params: IEntityKeyTagSet,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion>;
  deleteEntityTag: (
    params: IEntityKeyTagSet,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ITagsWithVersion>;
}
