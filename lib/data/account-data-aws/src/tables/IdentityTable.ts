import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { AccountDataException } from '@5qtrs/account-data';
import { toBase64 } from '@5qtrs/base64';
import { AccountDataAwsConfig } from '../AccountDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const accountAgentIdIndex = 'accountId-agentId';
const identityIndex = 'identity';
const delimiter = '::';

const table: IAwsDynamoTable = {
  name: 'identity',
  attributes: { accountId: 'S', identity: 'S', agentId: 'S' },
  keys: ['accountId', 'identity'],
  toKey,
  toItem,
  fromItem,
  localIndexes: [
    {
      name: accountAgentIdIndex,
      keys: ['accountId', 'agentId'],
    },
  ],
  globalIndexes: [
    {
      name: identityIndex,
      keys: ['identity'],
    },
  ],
};

// ------------------
// Internal Functions
// ------------------

function toKey(identity: IIdentity, accountId: string) {
  return {
    accountId: { S: accountId },
    identity: { S: toIdentity(identity) },
  };
}

function toItem(identity: IIdentity, { accountId, agentId }: { accountId: string; agentId: string }) {
  const item: any = toKey(identity, accountId);
  item.agentId = { S: agentId };
  item.issuerId = { S: identity.iss };
  item.subject = { S: identity.sub };
  return item;
}

function fromItem(item: any): IFullIdentity {
  return {
    accountId: item.accountId.S,
    iss: item.issuerId.S,
    sub: item.subject.S,
    agentId: item.agentId.S,
  };
}

function getConfig(config: AccountDataAwsConfig) {
  return () => ({
    defaultLimit: config.identityDefaultLimit,
    maxLimit: config.identityMaxLimit,
  });
}

function toIdentity(identity: IIdentity) {
  return `${toBase64(identity.iss)}${delimiter}${toBase64(identity.sub)}`;
}

function onIdentityAlreadyExists(identity: IIdentity) {
  throw AccountDataException.identityAlreadyExists(identity.iss, identity.sub);
}

function onNoIdentity(identity: IIdentity) {
  throw AccountDataException.noIdentity(identity.iss, identity.sub);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IIdentity {
  iss: string;
  sub: string;
}

export interface IFullIdentity extends IIdentity {
  accountId: string;
  agentId: string;
}

export interface IListIdentitiesOptions {
  next?: string;
  limit?: number;
  agentId?: string;
  issuerContains?: string;
  subjectContains?: string;
}

export interface IListIdentitiesResult {
  next?: string;
  items: IFullIdentity[];
}

// ----------------
// Exported Classes
// ----------------

export class IdentityTable extends AwsDynamoTable {
  private config: AccountDataAwsConfig;
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    return new IdentityTable(config, dynamo);
  }

  private constructor(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
    this.config = config;
  }

  public async add(accountId: string, agentId: string, identity: IIdentity): Promise<void> {
    const options = { onConditionCheckFailed: onIdentityAlreadyExists, context: { accountId, agentId } };
    await this.addItem(identity, options);
  }

  public async get(accountId: string, identity: IIdentity): Promise<IFullIdentity> {
    const options = { onNotFound: onNoIdentity, context: accountId };
    return this.getItem(identity, options);
  }

  public async list(accountId: string, options?: IListIdentitiesOptions): Promise<IListIdentitiesResult> {
    let index;
    const filters = [];
    const keyConditions = ['accountId = :accountId'];
    const expressionValues: any = { ':accountId': { S: accountId } };

    if (options) {
      if (options.agentId) {
        index = accountAgentIdIndex;
        expressionValues[':agentId'] = { S: options.agentId };
        keyConditions.push('agentId = :agentId');
      }

      if (options.issuerContains) {
        filters.push('contains(issuerId, :issuerId)');
        expressionValues[':issuerId'] = { S: options.issuerContains };
      }

      if (options.subjectContains) {
        filters.push('contains(subject, :subject)');
        expressionValues[':subject'] = { S: options.subjectContains };
      }
    }

    const queryOptions = {
      next: options && options.next ? options.next : undefined,
      limit: options && options.limit ? options.limit : undefined,
      index,
      expressionValues,
      keyConditions,
      filters,
    };

    return this.queryTable(queryOptions);
  }

  public async delete(accountId: string, identity: IIdentity): Promise<void> {
    const options = { onConditionCheckFailed: onNoIdentity, context: accountId };
    return this.deleteItem(identity, options);
  }

  public async addAllForAgent(accountId: string, agentId: string, identities: IIdentity[]): Promise<void> {
    await Promise.all(identities.map(identity => this.add(accountId, agentId, identity)));
  }

  public async getAllForAgent(accountId: string, agentId: string): Promise<IFullIdentity[]> {
    const all = [];
    const options: IListIdentitiesOptions = { next: undefined, limit: this.config.identityMaxLimit, agentId };
    do {
      const result = await this.list(accountId, options);
      all.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return all;
  }

  public async deleteAllForAgent(accountId: string, agentId: string, identities?: IIdentity[]): Promise<void> {
    identities = identities ? identities : await this.getAllForAgent(accountId, agentId);
    const options = { context: accountId };
    await this.deleteAllItems(identities, options);
  }

  public async listByIdentity(identity: IIdentity, options: IListIdentitiesOptions): Promise<IListIdentitiesResult> {
    const queryOptions = {
      next: options && options.next ? options.next : undefined,
      limit: options && options.limit ? options.limit : undefined,
      index: identityIndex,
      expressionNames: { '#identity': 'identity' },
      expressionValues: { ':identity': { S: toIdentity(identity) } },
      keyConditions: ['#identity = :identity'],
    };

    return this.queryTable(queryOptions);
  }
}
