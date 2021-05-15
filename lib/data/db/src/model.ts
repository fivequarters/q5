import moment from 'moment';
import * as AWS from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { RDSDataService } from 'aws-sdk';
import { Metadata, SqlRecords } from 'aws-sdk/clients/rdsdataservice';

export interface IRds {
  purgeExpiredItems: () => Promise<boolean>;
  ensureConnection: () => Promise<{ rdsSdk: AWS.RDSDataService; rdsCredentials: IRdsCredentials }>;
  executeStatement: (
    sql: string,
    objectParameters?: { [key: string]: any },
    statementOptions?: FinalStatementOptions
  ) => Promise<PromiseResult<RDSDataService.ExecuteStatementResponse, AWS.AWSError>>;
  executeBatchStatement: (
    sql: string,
    objectParameterArray: { [key: string]: any }[]
  ) => Promise<PromiseResult<RDSDataService.BatchExecuteStatementResponse, AWS.AWSError>>;
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

// --------------------------------
// EntityKey Components
// --------------------------------

export interface ITags {
  [key: string]: string;
}

export interface ITagsWithVersion {
  tags: ITags;
  version?: string;
}

// Data needed for any request
export interface IEntityCore {
  accountId: string;
  subscriptionId: string;
}

// Data needed for selects and deletes
interface IEntitySelectAbstract extends IEntityCore {
  tags?: ITags;
  version?: string;
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

// --------------------------------
// IEntity Extensions
// --------------------------------

export interface IIntegration extends IEntity {}
export interface IConnector extends IEntity {}
export interface IStorageItem extends IEntity {}
export interface IOperation extends IEntity {}
export interface IEntityGeneric extends IIntegration, IConnector, IStorageItem, IOperation {}

// --------------------------------
// Utilities
// --------------------------------

export type RequiredKeysOnly<T> = {
  [K in keyof { [key in keyof T]: T[key] extends undefined ? never : T[K] }]: T[K];
};

// --------------------------------
// Entity Constructors Arguments
// --------------------------------

// Queries
export interface DefaultQueryOptions {
  upsert?: boolean;
  filterExpired?: boolean;
  listLimit?: number;
}
export interface MergedQueryOptions extends DefaultQueryOptions {
  upsert: boolean;
  filterExpired: boolean;
  listLimit: number;
}
export interface InputQueryOptionsWithDefaults extends DefaultQueryOptions {}
export interface InputQueryOptionsWithoutDefaults {}
export interface InputQueryOptions extends InputQueryOptionsWithDefaults, InputQueryOptionsWithoutDefaults {}
export interface FinalQueryOptions extends InputQueryOptionsWithoutDefaults, MergedQueryOptions {}

// Statements
export interface DefaultStatementOptions {}
export interface MergedStatementOptions extends DefaultStatementOptions {
  transactionId?: string;
}
export interface InputStatementOptionsWithDefaults extends DefaultStatementOptions {}
export interface InputStatementOptionsWithoutDefaults {}
export interface InputStatementOptions
  extends InputStatementOptionsWithDefaults,
    InputStatementOptionsWithoutDefaults {}
export interface FinalStatementOptions extends InputStatementOptionsWithoutDefaults, MergedStatementOptions {}

// Parameters
export interface DefaultParameterOptions {
  expires?: moment.Moment;
  expiresDuration?: moment.Duration;
}
export interface MergedParameterOptions extends DefaultParameterOptions {}

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
export interface MergedConstructorArguments extends DefaultConstructorArguments, InputConstructorArguments {
  upsert: boolean;
  filterExpired: boolean;
  listLimit: number;
}

export enum EntityType {
  Integration = 'integration',
  Connector = 'connector',
  Operation = 'operation',
  Storage = 'storage',
}

// --------------------------------
// DAO Class Definitions
// --------------------------------

export interface IDAO {
  createTransactional: (transactionId: string) => this;
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
