import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { toBase64, fromBase64 } from '@5qtrs/base64';
import { notIn } from '@5qtrs/array';

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

function getIdentityMap(iss: string, sub: string, agentId: string) {
  return [toBase64(iss), toBase64(sub), agentId].join(delimiter);
}

function toDynamoKey(accountId: string, agentId: string, identity: IIdentity) {
  const identityMap = getIdentityMap(identity.iss, identity.sub, agentId);
  return {
    accountId: { S: accountId },
    identityMap: { S: identityMap },
  };
}

function toDynamoItem(accountId: string, agentId: string, identity: IIdentity) {
  const item: any = toDynamoKey(accountId, agentId, identity);
  item.agentId = { S: agentId };
  item.issSub = { S: [toBase64(identity.iss), toBase64(identity.sub)].join(delimiter) };
  item.iss = { S: identity.iss };
  item.sub = { S: identity.sub };
  return item;
}

function fromDynamoItem(item: any, full: boolean = false): IFullIdentity {
  const identityMap = item.identityMap.S;
  const [issEncoded, subEncoded, __] = identityMap.split(delimiter);
  return {
    accountId: full ? item.accountId.S : undefined,
    iss: fromBase64(issEncoded),
    sub: fromBase64(subEncoded),
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

export interface IListIdentitiesOptions {
  next?: string;
  full?: boolean;
  limit?: number;
}

export interface IListIdentitiesResult {
  next?: string;
  items: IFullIdentity[];
}

export interface IFullIdentity extends IIdentity {
  accountId: string;
  agentId: string;
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
      attributes: { accountId: 'S', identityMap: 'S', agentId: 'S', issSub: 'S' },
      keys: ['accountId', 'identityMap'],
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
      expressionNames: { '#accountId': 'iaccountIdd', '#identityMap': 'identityMap' },
      condition: 'attribute_not_exists(#accountId) and attribute_not_exists(#identityMap)',
    };

    const item = toDynamoItem(accountId, agentId, newIdentity);
    await this.dynamo.putItem(tableName, item, options);
    return newIdentity;
  }

  public async removeIdentity(accountId: string, agentId: string, identity: IIdentity): Promise<void> {
    const key = toDynamoKey(accountId, agentId, identity);
    return this.dynamo.deleteItem(tableName, key);
  }

  public async addAllIdentities(accountId: string, agentId: string, newIdentities: IIdentity[]): Promise<IIdentity[]> {
    return Promise.all(newIdentities.map(identity => this.addIdentity(accountId, agentId, identity)));
  }

  public async removeAllIdentities(accountId: string, agentId: string, identities?: IIdentity[]): Promise<void> {
    const toRemove = identities ? identities : await this.listAllIdentities(accountId, agentId, true);
    const keys = toRemove.map(identity => toDynamoKey(accountId, agentId, identity));
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
    const toAdd = notIn(fullIdentities, existingIdentities, areEqual);
    const toRemove = notIn(existingIdentities, fullIdentities, areEqual);
    await Promise.all([
      this.addAllIdentities(accountId, agentId, toAdd),
      this.removeAllIdentities(accountId, agentId, toRemove),
    ]);
    return identities;
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
      expressionNames: { '#agentId': 'agentId', '#accountId': 'accountId' },
      expressionValues: { ':agentId': { S: agentId }, ':accountId': { S: accountId } },
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

  public async getAgentId(accountId: string, iss: string, sub: string): Promise<IFullIdentity | undefined> {
    const queryOptions = {
      expressionNames: { '#accountId': 'accountId', '#identityMap': 'identityMap' },
      expressionValues: {
        ':accountId': { S: accountId },
        ':identityMap': { S: [iss, sub].map(toBase64).join(delimiter) },
      },
      keyCondition: '#accountId = :accountId and begins_with(#identityMap, :identityMap)',
    };

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    return result && result.items && result.items[0] ? fromDynamoItem(result.items[0], true) : undefined;
  }

  public async listIssuerSubjectAccounts(
    iss: string,
    sub: string,
    options: IListIdentitiesOptions
  ): Promise<IListIdentitiesResult> {
    const next = options && options.next ? options.next : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit < maxLimit ? limit : maxLimit;
    const full = options && options.full !== undefined ? options.full : true;

    const queryOptions = {
      index: issSubIndex,
      expressionNames: { '#issSub': 'issSub' },
      expressionValues: { ':issSub': { S: [iss, sub].map(toBase64).join(delimiter) } },
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
