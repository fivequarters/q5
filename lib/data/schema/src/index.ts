// --------------------------------
// EntityKey Components
// --------------------------------

export enum EntityType {
  integration = 'integration',
  connector = 'connector',
  operation = 'operation',
  storage = 'storage',
  instance = 'instance',
  identity = 'identity',
  session = 'session',
}

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
  total: number;
}

// The Entity returned by the SDK, sans various internal parameters.
export interface ISdkEntity {
  id: string;
  tags?: ITags;
  data?: any;
  expires?: string;
  version?: string;
}

export interface ISubordinateId {
  parentEntityType: EntityType;
  parentEntityId: string;
  entityId: string;
}

// --------------------------------
// IEntity Extensions
// --------------------------------

export interface IIntegrationComponent {
  name: string;
  entityType: EntityType.integration | EntityType.connector;
  accountId?: string;
  subscriptionId?: string;
  entityId: string;
  skip?: boolean;
  path?: string;
  dependsOn: string[];
  package?: string; // Great opportunity for a conditional type, in the future.
}

export interface IIntegrationData {
  files: Record<string, string>;
  handler: string;
  configuration: Record<string, any>;
  componentTags: Record<string, string>;
  components: IIntegrationComponent[];
}

export interface IIntegration extends IEntity {
  data: IIntegrationData;
}

export interface IConnectorData {
  handler: string;
  configuration: {
    muxIntegration?: IEntityId;
    [key: string]: any;
  };
  files: Record<string, string>;
}

export interface IConnector extends IEntity {
  data: IConnectorData;
}

export interface IOperation extends IEntity {
  data: {
    verb: 'creating' | 'updating' | 'deleting';
    type: EntityType;
    code: number; // HTTP status codes
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

  // Instance created as a result of a session POST.
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

export interface IInstance extends IEntity {
  data: any;
}
