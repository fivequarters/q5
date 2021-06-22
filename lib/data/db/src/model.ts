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

type IDaoCollectionIndex = {
  [key in EntityType]: IEntityDao<any>;
};

export interface IDaoCollection extends IDaoCollectionIndex {
  connector: IEntityDao<IConnector>;
  integration: IEntityDao<IIntegration>;
  storage: IEntityDao<IStorageItem>;
  operation: IEntityDao<IOperation>;
  session: IEntityDao<ISession>;
  identity: IEntityDao<IIdentity>;
  instance: IEntityDao<IInstance>;
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
  __databaseId?: string;
}

// Data needed for selects and deletes
interface IEntitySelectAbstract extends IEntityCore {
  tags?: ITags;
  version?: string;
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
  data?: any;
  expires?: string;
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

// The Entity returned by the SDK, sans various internal parameters.
export interface ISdkEntity {
  id: string;
  tags?: ITags;
  data?: any;
  expires?: string;
  version?: string;
}

// Remove any extra fields returned as part of the entity.
export const entityToSdk = (entity: IEntity): ISdkEntity => ({
  id: entity.id,
  data: entity.data,
  tags: entity.tags,
  expires: entity.expires,
  version: entity.version,
});

// --------------------------------
// IEntity Extensions
// --------------------------------

export enum SessionMode {
  trunk = 'trunk',
  leaf = 'leaf',
}

export interface IStep {
  stepName: string;
  input?: any;
  output?: any;
  uses?: string[];
  target: {
    entityType: EntityType.connector | EntityType.integration;
    accountId?: string;
    subscriptionId?: string;
    entityId: string;
    path?: string;
  };
}

export interface IIntegration extends IEntity {
  data: {
    handler: string;
    configuration: {
      connectors: Record<string, { connector: string; package: string; config?: any }>;
      creation: {
        tags: ITags;
        steps: Record<string, IStep>;
        autoStep: boolean;
      };
    };
    files: Record<string, string>;
  };
}

export interface IConnector extends IEntity {
  data: {
    handler: string;
    configuration: {
      muxIntegration: IEntityId;
    };
    files: Record<string, string>;
  };
}

export interface IOperation extends IEntity {
  data: {
    verb: 'creating' | 'updating' | 'deleting';
    type: EntityType.connector | EntityType.integration | EntityType.session;
    code: number; // HTTP status codes
    message?: string;
    payload?: any;
    location: {
      accountId: string;
      subscriptionId: string;
      entityId?: string;
      componentId?: string;
      subordinateId?: string;
      entityType: EntityType;
    };
  };
}

export interface ISessionParameters {
  steps?: string[];
  tags?: ITags;
  input?: Record<string, any>;
  redirectUrl: string;
}

export interface ILeafSessionData extends IStep {
  mode: SessionMode.leaf;
  meta: {
    stepName: string;
    parentId: string;
  };
}

export type ITrunkSessionStep = IStep & { childSessionId?: string };
export type ITrunkSessionSteps = ITrunkSessionStep[];
export interface ITrunkSessionData {
  mode: SessionMode.trunk;

  meta: {
    redirectUrl: string;
  };

  steps: ITrunkSessionSteps;
}

export interface ILeafSession extends IEntity {
  data: ILeafSessionData;
}

export interface ITrunkSession extends IEntity {
  data: ITrunkSessionData;
}

export type ISession = ITrunkSession | ILeafSession;

export interface IStorageItem extends IEntity {
  data: any;
}

export interface IIdentity extends IEntity {
  data: any;
}

export interface IInstance extends IEntity {
  data: any;
}

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
  integration = 'integration',
  connector = 'connector',
  operation = 'operation',
  storage = 'storage',
  instance = 'instance',
  identity = 'identity',
  session = 'session',
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
  getDaoType: () => string;
}
