import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { toBase64 } from '@5qtrs/base64';
import { difference } from '@5qtrs/array';

// ------------------
// Internal Constants
// ------------------

const tableName = 'identity';
const accountAgentIdIndex = 'byAccountAndAgentId';
const issSubIndex = 'byIssSub';
const defaultLimit = 25;
const maxLimit = 100;
const delimiter = '::';

// ------------------
// Internal Functions
// ------------------

function toDynamoKey(accountId: string, identity: IIdentity) {
  const issSub = [toBase64(identity.iss), toBase64(identity.sub)].join(delimiter);
  return {
    accountId: { S: accountId },
    issSub: { S: issSub },
  };
}

function toDynamoItem(accountId: string, agentId: string, identity: IIdentity) {
  const item: any = toDynamoKey(accountId, identity);
  item.agentId = { S: agentId };
  item.iss = { S: identity.iss };
  item.sub = { S: identity.sub };
  return item;
}

function fromDynamoItem(item: any, full: boolean = false): IFullIdentity {
  return {
    accountId: full ? item.accountId.S : undefined,
    iss: item.iss.S,
    sub: item.sub.S,
    agentId: full ? item.agentId.S : undefined,
  };
}

function areEqual(identity1: IFullIdentity, identity2: IFullIdentity) {
  return (
    identity1.iss === identity2.iss &&
    identity1.sub === identity2.sub &&
    identity1.accountId === identity2.accountId &&
    identity1.agentId === identity2.agentId
  );
}

function toFullIdentity(accountId: string, agentId: string, identity: IIdentity) {
  return {
    accountId,
    agentId,
    iss: identity.iss,
    sub: identity.sub,
  };
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
  full?: boolean;
  limit?: number;
}

export interface IListIdentitiesResult {
  next?: string;
  items: IFullIdentity[];
}

// ----------------
// Exported Classes
// ----------------

export class IdentityStore {
  private dynamo: AwsDynamo;

  private constructor(dynamo: AwsDynamo) {
    this.dynamo = dynamo;
  }

  public static async create(dynamo: AwsDynamo) {
    return new IdentityStore(dynamo);
  }

  public async isSetup() {
    return this.dynamo.tableExists(tableName);
  }

  public async setup() {
    return this.dynamo.ensureTable({
      name: tableName,
      attributes: { accountId: 'S', issSub: 'S', agentId: 'S' },
      keys: ['accountId', 'issSub'],
      localIndexes: [
        {
          name: accountAgentIdIndex,
          keys: ['accountId', 'agentId'],
        },
      ],
      globalIndexes: [
        {
          name: issSubIndex,
          keys: ['issSub'],
        },
      ],
    });
  }

  public async addIdentity(accountId: string, agentId: string, newIdentity: IIdentity): Promise<IIdentity> {
    const options = {
      expressionNames: { '#accountId': 'accountId', '#issSub': 'issSub' },
      condition: 'attribute_not_exists(#accountId) and attribute_not_exists(#issSub)',
    };

    const item = toDynamoItem(accountId, agentId, newIdentity);
    await this.dynamo.putItem(tableName, item, options);
    return newIdentity;
  }

  public async removeIdentity(accountId: string, identity: IIdentity): Promise<void> {
    const key = toDynamoKey(accountId, identity);
    return this.dynamo.deleteItem(tableName, key);
  }

  public async addAllIdentities(accountId: string, agentId: string, newIdentities: IIdentity[]): Promise<IIdentity[]> {
    return Promise.all(newIdentities.map(identity => this.addIdentity(accountId, agentId, identity)));
  }

  public async removeAllIdentities(accountId: string, agentId: string, identities?: IIdentity[]): Promise<void> {
    const toRemove = identities ? identities : await this.listAllIdentities(accountId, agentId, true);
    const keys = toRemove.map(identity => toDynamoKey(accountId, identity));
    return this.dynamo.deleteAll(tableName, keys);
  }

  public async replaceAllIdentities(
    accountId: string,
    agentId: string,
    identities?: IIdentity[]
  ): Promise<IIdentity[]> {
    const existingIdentities = await this.listAllIdentities(accountId, agentId, true);
    if (identities === undefined) {
      return existingIdentities;
    }
    const fullIdentities = identities.map(id => toFullIdentity(accountId, agentId, id));
    const toAdd = difference(fullIdentities, existingIdentities, areEqual);
    const toRemove = difference(existingIdentities, fullIdentities, areEqual);

    await Promise.all([
      this.addAllIdentities(accountId, agentId, toAdd),
      this.removeAllIdentities(accountId, agentId, toRemove),
    ]);

    const actual = difference(existingIdentities, toRemove);
    actual.push(...toAdd);
    return actual;
  }

  public async listAllIdentities(accountId: string, agentId: string, full: boolean = false): Promise<IFullIdentity[]> {
    const all = [];
    const options: IListIdentitiesOptions = { next: undefined, limit: maxLimit, full };
    do {
      const result = await this.listIdentities(accountId, agentId, options);
      all.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return all;
  }

  public async listIdentities(
    accountId: string,
    agentId: string,
    options: IListIdentitiesOptions
  ): Promise<IListIdentitiesResult> {
    const next = options && options.next ? options.next : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit < maxLimit ? limit : maxLimit;
    const full = options && options.full !== undefined ? options.full : false;

    const queryOptions = {
      index: accountAgentIdIndex,
      expressionNames: { '#accountId': 'accountId', '#agentId': 'agentId' },
      expressionValues: { ':accountId': { S: accountId }, ':agentId': { S: agentId } },
      keyCondition: '#agentId = :agentId and #accountId = :accountId',
      limit: limit || undefined,
      next: next || undefined,
    };

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    const items = result.items.map(item => fromDynamoItem(item, full));
    return {
      next: result.next || undefined,
      items,
    };
  }

  public async getAgentId(accountId: string, identity: IIdentity): Promise<IFullIdentity | undefined> {
    const key = toDynamoKey(accountId, identity);
    const item = await this.dynamo.getItem(tableName, key);
    return item ? fromDynamoItem(item, true) : undefined;
  }

  public async listIssuerSubjectAccounts(
    identity: IIdentity,
    options: IListIdentitiesOptions
  ): Promise<IListIdentitiesResult> {
    const next = options && options.next ? options.next : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit < maxLimit ? limit : maxLimit;
    const full = options && options.full !== undefined ? options.full : true;

    const queryOptions = {
      index: issSubIndex,
      expressionNames: { '#issSub': 'issSub' },
      expressionValues: { ':issSub': { S: [identity.iss, identity.sub].map(toBase64).join(delimiter) } },
      keyCondition: '#issSub = :issSub',
      limit: limit || undefined,
      next: next || undefined,
    };

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    const items = result.items.map(item => fromDynamoItem(item, full));
    return {
      next: result.next || undefined,
      items,
    };
  }
}
