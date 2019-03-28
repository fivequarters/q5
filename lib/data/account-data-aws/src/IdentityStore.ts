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

function getIdentityId(accountId: string, iss: string, sub: string) {
  return [accountId, iss, sub].map(toBase64).join(delimiter);
}

function toDynamoKey(accountId: string, agentId: string, identity: IIdentity) {
  const id = getIdentityId(accountId, identity.iss, identity.sub);
  return {
    id: { S: id },
    agentId: { S: agentId },
  };
}

function toDynamoItem(accountId: string, agentId: string, identity: IIdentity) {
  const item: any = toDynamoKey(accountId, agentId, identity);
  item.accountId = { S: accountId };
  item.issSub = { S: [toBase64(identity.iss), toBase64(identity.sub)].join(delimiter) };
  return item;
}

function fromDynamoItem(item: any): IFullIdentity {
  const id = item.id.S;
  const [accountId, iss, sub] = id.split(delimiter).map((segment: string) => fromBase64(segment));
  return {
    iss,
    sub,
    accountId,
    agentId: item.agentId.S,
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
  limit?: number;
}

export interface IListIdentitiesResult {
  next?: string;
  items: IIdentity[];
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
      attributes: { id: 'S', agentId: 'S', accountId: 'S', issSub: 'S' },
      keys: ['id', 'agentId'],
      globalIndexes: [
        {
          name: accountAgentIdIndex,
          keys: ['accountId', 'agentId'],
        },
        {
          name: issSubIndex,
          keys: ['issSub'],
        },
      ],
    });
  }

  public async addIdentity(accountId: string, agentId: string, newIdentity: IIdentity): Promise<IIdentity> {
    const options = {
      expressionNames: { '#id': 'id', '#agentId': 'agentId' },
      condition: 'attribute_not_exists(#id) and attribute_not_exists(#agentId)',
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
    const toRemove = identities ? identities : await this.listAllIdentities(accountId, agentId);
    const keys = toRemove.map(identity => toDynamoKey(accountId, agentId, identity));
    return this.dynamo.deleteAll(tableName, keys);
  }

  public async replaceAllIdentities(accountId: string, agentId: string, identities: IIdentity[]): Promise<IIdentity[]> {
    const existingIdentities = await this.listAllIdentities(accountId, agentId);
    const toAdd = notIn(identities, existingIdentities);
    const toRemove = notIn(existingIdentities, identities);
    await Promise.all([
      this.addAllIdentities(accountId, agentId, toAdd),
      this.removeAllIdentities(accountId, agentId, toRemove),
    ]);
    return identities;
  }

  public async listAllIdentities(accountId: string, agentId: string): Promise<IIdentity[]> {
    const all = [];
    const options: IListIdentitiesOptions = { next: undefined, limit: maxLimit };
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

    const queryOptions = {
      indexName: accountAgentIdIndex,
      expressionNames: { '#agentId': 'agentId', '#accountId': 'accountId' },
      expressionValues: { ':agentId': { S: agentId }, ':accountId': { S: accountId } },
      keyCondtion: '#agentId = :agentId && #accountId = :accountId',
      limit: limit || undefined,
      next: next || undefined,
    };

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    const items = result.items.map(fromDynamoItem);
    return {
      next: result.next || undefined,
      items,
    };
  }

  public async getAgentId(accountId: string, iss: string, sub: string): Promise<IFullIdentity | undefined> {
    const queryOptions = {
      expressionNames: { '#id': 'id' },
      expressionValues: { ':id': { S: getIdentityId(accountId, iss, sub) } },
      keyCondtion: '#id = :id',
    };

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    return result && result.items && result.items[0] ? fromDynamoItem(result.items[0]) : undefined;
  }

  public async listIssuerSubjectAccounts(
    iss: string,
    sub: string,
    options: IListIdentitiesOptions
  ): Promise<IListIdentitiesResult> {
    const next = options && options.next ? options.next : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit < maxLimit ? limit : maxLimit;

    const queryOptions = {
      indexName: issSubIndex,
      expressionNames: { '#issSub': 'issSub' },
      expressionValues: { ':issSub': { S: [iss, sub].map(toBase64).join(delimiter) } },
      keyCondtion: '#issSub = :issSub',
      limit: limit || undefined,
      next: next || undefined,
    };

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    const items = result.items.map(fromDynamoItem);
    return {
      next: result.next || undefined,
      items,
    };
  }
}
