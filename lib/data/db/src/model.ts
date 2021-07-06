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
  inTransaction: <T>(func: (daoCollection: IDaoCollection) => Promise<T>) => Promise<T>;
  ensureRecords: (
    result: RDSDataService.ExecuteStatementResponse
  ) => asserts result is RDSDataService.ExecuteStatementResponse & {
    records: SqlRecords;
    columnMetadata: Metadata;
  };
  DAO: IDaoCollection;
}

// --------------------------------
// EntityKey Components
// --------------------------------

import * as Schema from '@fusebit/schema';
export * from '@fusebit/schema';

type IDaoCollectionIndex = {
  [key in Schema.EntityType]: IEntityDao<any>;
};

export interface IDaoCollection extends IDaoCollectionIndex {
  connector: IEntityDao<Schema.IConnector>;
  integration: IEntityDao<Schema.IIntegration>;
  storage: IEntityDao<Schema.IStorageItem>;
  operation: IEntityDao<Schema.IOperation>;
  session: IEntityDao<Schema.ISession>;
  identity: IEntityDao<Schema.IIdentity>;
  instance: IEntityDao<Schema.IInstance>;
}

export interface IRdsCredentials {
  resourceArn: string;
  secretArn: string;
}

// --------------------------------
// Utilities
// --------------------------------

export type RequiredKeysOnly<T> = {
  [K in keyof { [key in keyof T]: T[key] extends undefined ? never : T[K] }]: T[K];
};

// Capture the parent entity type to prevent a sessionId created under an integration from being accessed
// under a connector, and thus bypassing security checks.
export const createSubordinateId = (
  parentEntityType: Schema.EntityType,
  parentEntityId: string,
  entityId: string
): string => {
  return `/${parentEntityType}/${parentEntityId}/${entityId}`;
};

export const decomposeSubordinateId = (id: string): Schema.ISubordinateId => {
  const [parentEntityType, parentEntityId, entityId] = id.split('/').slice(1);

  return {
    parentEntityType: parentEntityType as Schema.EntityType,
    parentEntityId,
    entityId,
  };
};

// Remove any extra fields returned as part of the entity.
export const entityToSdk = (entity: Schema.IEntity): Schema.ISdkEntity => {
  return {
    id: entity.id && entity.id.indexOf('/') >= 0 ? decomposeSubordinateId(entity.id).entityId : entity.id,
    data: entity.data,
    tags: entity.tags,
    expires: entity.expires,
    version: entity.version,
  };
};

// --------------------------------
// Entity Constructors Arguments
// --------------------------------

// Queries
export interface DefaultQueryOptions {
  upsert?: boolean;
  filterExpired?: boolean;
  listLimit?: number;
  next?: string;
}
export interface MergedQueryOptions extends DefaultQueryOptions {
  upsert: boolean;
  filterExpired: boolean;
  listLimit: number;
}
export interface InputQueryOptionsWithDefaults extends DefaultQueryOptions {}
export interface InputQueryOptionsWithoutDefaults {
  next?: string;
}
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
export interface DefaultParameterOptions {}
export interface MergedParameterOptions extends DefaultParameterOptions {}

// Constructors
export interface DefaultOptions extends DefaultQueryOptions, DefaultParameterOptions, DefaultStatementOptions {}
export interface DefaultConstructorArguments extends DefaultOptions {
  upsert: boolean;
  filterExpired: boolean;
  listLimit: number;
}
export interface InputConstructorArguments extends DefaultOptions {
  entityType: Schema.EntityType;
  RDS: IRds;
  transactionId?: string;
}
export interface MergedConstructorArguments extends DefaultConstructorArguments, InputConstructorArguments {
  upsert: boolean;
  filterExpired: boolean;
  listLimit: number;
}

// --------------------------------
// DAO Class Definitions
// --------------------------------

export interface IDAO {
  createTransactional: (transactionId: string) => this;
}

export interface IEntityDao<ET extends Schema.IEntity> extends IDAO {
  sqlToIEntity: <T>(result: RDSDataService.ExecuteStatementResponse) => T[];
  getDaoType: () => Schema.EntityType;

  getEntity: (
    params: Schema.IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET>;
  getEntityTags: (
    params: Schema.IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<Schema.ITagsWithVersion>;
  listEntities: (params: Schema.IEntityPrefix, queryOptions?: InputQueryOptions) => Promise<Schema.IListResponse<ET>>;
  deleteEntity: (
    params: Schema.IEntityPrefix,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<boolean>;
  createEntity: (
    params: Schema.IEntity,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET>;
  updateEntity: (
    params: Schema.IEntity,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<ET>;
  updateEntityTags: (
    params: Schema.IEntityId,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<Schema.ITagsWithVersion>;
  setEntityTag: (
    params: Schema.IEntityKeyTagSet,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<Schema.ITagsWithVersion>;
  deleteEntityTag: (
    params: Schema.IEntityKeyTagSet,
    queryOptions?: InputQueryOptions,
    statementOptions?: InputStatementOptions
  ) => Promise<Schema.ITagsWithVersion>;
}
