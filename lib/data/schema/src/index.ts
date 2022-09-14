// --------------------------------
// EntityKey Components
// --------------------------------

export enum EntityType {
  integration = 'integration',
  connector = 'connector',
  storage = 'storage',
  install = 'install',
  identity = 'identity',
  session = 'session',
}

export enum EntityState {
  creating = 'creating',
  invalid = 'invalid',
  active = 'active',
}

export enum OperationType {
  creating = 'creating',
  updating = 'updating',
  deleting = 'deleting',
}

export enum OperationStatus {
  success = 'success',
  failed = 'failed',
  processing = 'processing',
}

export enum OperationErrorCode {
  OK = 'OK',
  InvalidParameterValue = 'InvalidParameterValue',
  UnauthorizedOperation = 'UnauthorizedOperation',
  VersionConflict = 'VersionConflict',
  InternalError = 'InternalError',
  RequestLimitExceeded = 'RequestLimitExceeded',
}

export interface IOperationState {
  operation: OperationType;
  status: OperationStatus;
  message?: string;
  errorCode?: OperationErrorCode;
  errorDetails?: any;
}

export interface ITags {
  [key: string]: string | null;
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
  entityType?: string;
}

// Data needed for selects and deletes
interface IEntitySelectAbstract extends IEntityCore {
  tags?: ITags;
  version?: string;
}
export interface IEntityId extends IEntitySelectAbstract {
  id: string;
  parentId?: string;
}
export interface IEntityPrefix extends IEntitySelectAbstract {
  id?: string;
  idPrefix?: string;
  state?: EntityState;
}

export interface IEntity extends IEntityId {
  tags?: ITags;
  data?: any;
  expires?: string;
  state?: EntityState;
  operationState?: IOperationState;
  dateAdded?: string;
  dateModified?: string;
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
  total: number;
}

// The Entity returned by the SDK, sans various internal parameters.
export interface ISdkEntity {
  id: string;
  entityType?: string;
  parentId?: string;
  tags?: ITags;
  data?: any;
  expires?: string;
  version?: string;
  state?: EntityState;
  operationState?: IOperationState;
  dateAdded?: string;
  dateModified?: string;
}

export interface ISubordinateId {
  parentEntityType: EntityType;
  parentEntityId: string;
  entityId: string;
}

// --------------------------------
// IEntity Extensions
// --------------------------------

export interface IEntityPermission {
  action: string;
  resource: string;
}

export interface IIntegrationComponent {
  name: string;
  entityType: EntityType.integration | EntityType.connector;
  accountId?: string;
  subscriptionId?: string;
  entityId: string;
  skip?: boolean;
  path?: string;
  dependsOn: string[];
  provider?: string; // Great opportunity for a conditional type, in the future.
}

export interface IIntegrationSchedule {
  cron: string;
  timezone: string;
  endpoint: string;
}

export interface IIntegrationData {
  files: Record<string, string>;
  encodedFiles?: Record<string, { data: string; encoding: string }>;
  handler: string;
  configuration: Record<string, any>;
  componentTags: Record<string, string>;
  components: IIntegrationComponent[];
  schedule?: IIntegrationSchedule[];
  security?: {
    permissions: IEntityPermission[];
  };
  fusebitEditor?: {
    runConfig: {
      url?: string;
      method?: string;
      payload?: Record<string, any>;
    }[];
  };
  routes?: {
    path: string;
    security?: {
      authentication?: string;
      authorization?: any;
      functionPermissions?: IEntityPermission[];
    };
    task?: {
      maxPending?: number;
      maxRunning?: number;
    };
  }[];
}

export interface IIntegration extends IEntity {
  data: IIntegrationData;
}

export interface IConnectorData {
  files: Record<string, string>;
  encodedFiles?: Record<string, { data: string; encoding: string }>;
  handler: string;
  configuration: {
    muxIntegration?: IEntityId;
    [key: string]: any;
  };
  security?: {
    permissions: IEntityPermission[];
  };
}

export interface IConnector extends IEntity {
  data: IConnectorData;
}

export interface IOperation extends IEntity {
  data: {
    verb: 'creating' | 'updating' | 'deleting';
    type: EntityType;
    statusCode: number; // HTTP status codes
    message?: string;
    payload?: any;
    location: {
      accountId: string;
      subscriptionId: string;
      entityId?: string;
      entityType: EntityType;
    };
  };
}

export interface ISessionParameters {
  components?: string[];
  tags?: ITags;
  extendTags: boolean;
  input?: Record<string, any>;
  redirectUrl: string;
  installId?: string;
}

export interface IStep extends IIntegrationComponent {
  input?: any;
  output?: any;
  childSessionId?: string;
}

export enum SessionMode {
  trunk = 'trunk',
  leaf = 'leaf',
}

export interface ITrunkSessionData {
  mode: SessionMode.trunk;

  redirectUrl: string;

  components: IStep[];

  replacementTargetId?: string;

  // Install created as a result of a session POST.
  output?: {
    accountId: string;
    subscriptionId: string;
    parentEntityId: string;
    parentEntityType: EntityType;
    entityType: EntityType;
    entityId: string;
    tags: ITags;
  };
}

export interface ITrunkSession extends IEntity {
  data: ITrunkSessionData;
}

export interface ILeafSessionData extends Omit<IStep, 'uses' | 'childSessionId' | 'dependsOn'> {
  replacementTargetId?: string;
  mode: SessionMode.leaf;
  dependsOn: Record<string, object>;
  parentId: string;
}

export interface ILeafSession extends IEntity {
  data: ILeafSessionData;
}

export type ISession = ITrunkSession | ILeafSession;

export interface IStorageItem extends IEntity {
  data: any;
}

export interface IIdentity extends IEntity {
  data: any;
}

export interface IInstall extends IEntity {
  data: any;
}
