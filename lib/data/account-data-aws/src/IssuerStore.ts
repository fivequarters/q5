import { AwsDynamo } from '@5qtrs/aws-dynamo';

// ------------------
// Internal Constants
// ------------------

const tableName = 'issuer';
const issuerIndex = 'byIssuer';
const defaultLimit = 25;
const maxLimit = 100;

// ------------------
// Internal Functions
// ------------------

function toDynamoKey(accountId: string, id: string) {
  return {
    accountId: { S: accountId },
    identityId: { S: id },
  };
}

function toDynamoItem(accountId: string, issuer: IIssuer) {
  const publicKeys = issuer.publicKeys || undefined;
  const item: any = toDynamoKey(accountId, issuer.id);
  item.displayName = issuer.displayName ? { S: issuer.displayName } : undefined;
  item.jsonKeyUri = issuer.jsonKeyUri ? { S: issuer.jsonKeyUri } : undefined;
  item.kid0 = publicKeys && publicKeys[0] ? { S: publicKeys[0].kid } : undefined;
  item.publicKey0 = publicKeys && publicKeys[0] ? { S: publicKeys[0].publicKey } : undefined;
  item.kid1 = publicKeys && publicKeys[1] ? { S: publicKeys[1].kid } : undefined;
  item.publicKey1 = publicKeys && publicKeys[1] ? { S: publicKeys[1].publicKey } : undefined;
  item.kid2 = publicKeys && publicKeys[2] ? { S: publicKeys[2].kid } : undefined;
  item.publicKey2 = publicKeys && publicKeys[2] ? { S: publicKeys[2].publicKey } : undefined;
  return item;
}

function mergeFromDynamoItem(issuer: IIssuer, item: any) {
  issuer.displayName = !issuer.displayName && item.displayName ? item.displayName.S : issuer.displayName || '';
  issuer.jsonKeyUri = !issuer.jsonKeyUri && item.jsonKeyUri ? item.jsonKeyUri.S : issuer.jsonKeyUri || '';
  issuer.publicKeys = [];
  if (item.kid0) {
    issuer.publicKeys.push({ kid: item.kid0.S, publicKey: item.publicKey0.S });
  }
  if (item.kid1) {
    issuer.publicKeys.push({ kid: item.kid1.S, publicKey: item.publicKey1.S });
  }
  if (item.kid2) {
    issuer.publicKeys.push({ kid: item.kid2.S, publicKey: item.publicKey2.S });
  }
}

function fromDynamoItem(item: any): IIssuer {
  const issuer: IIssuer = { id: item.identityId.S };
  mergeFromDynamoItem(issuer, item);
  return issuer;
}

function validateIssuer(issuer: IIssuer) {
  if (issuer.publicKeys && issuer.publicKeys.length > 3) {
    const message = 'No more than three public keys can be specified.';
    throw new Error(message);
  }

  if (issuer.publicKeys && issuer.publicKeys.length && issuer.jsonKeyUri) {
    const message = 'Either public keys may be specified or a json key URI, but not both.';
    throw new Error(message);
  }
}

// -------------------
// Exported Interfaces
// -------------------

export interface IIssuerPublicKey {
  kid: string;
  publicKey: string;
}

export interface IIssuer {
  id: string;
  displayName?: string;
  jsonKeyUri?: string;
  publicKeys?: IIssuerPublicKey[];
}

export interface IListIssuersOptions {
  next?: string;
  displayNameContains?: string;
  limit?: number;
}

export interface IListIssuersResult {
  next?: string;
  items: IIssuer[];
}

// ----------------
// Exported Classes
// ----------------

export class IssuerStore {
  private dynamo: AwsDynamo;

  private constructor(dynamo: AwsDynamo) {
    this.dynamo = dynamo;
  }

  public static async create(dynamo: AwsDynamo) {
    return new IssuerStore(dynamo);
  }

  public async isSetup() {
    return this.dynamo.tableExists(tableName);
  }

  public async setup() {
    return this.dynamo.ensureTable({
      name: tableName,
      attributes: { accountId: 'S', identityId: 'S' },
      keys: ['accountId', 'identityId'],
      globalIndexes: [
        {
          name: issuerIndex,
          keys: ['identityId'],
        },
      ],
    });
  }

  public async addIssuer(accountId: string, issuer: IIssuer): Promise<IIssuer> {
    validateIssuer(issuer);

    const options = {
      expressionNames: { '#accountId': 'accountId', '#identityId': 'identityId' },
      condition: 'attribute_not_exists(#accountId) and attribute_not_exists(#identityId)',
    };

    const item = toDynamoItem(accountId, issuer);
    await this.dynamo.putItem(tableName, item, options);
    return issuer;
  }

  public async updateIssuer(accountId: string, issuer: IIssuer): Promise<IIssuer> {
    validateIssuer(issuer);

    const updates = [];
    const expressionNames: any = {};
    const expressionValues: any = {};
    if (issuer.displayName) {
      updates.push('SET #displayName = :displayName');
      expressionNames['#displayName'] = 'displayName';
      expressionValues[':displayName'] = { S: issuer.displayName };
    }

    if (issuer.jsonKeyUri) {
      updates.push('SET #jsonKeyUri = :jsonKeyUri');
      expressionNames['#jsonKeyUri'] = 'jsonKeyUri';
      expressionValues[':jsonKeyUri'] = { S: issuer.jsonKeyUri };
    }

    if (issuer.publicKeys) {
      for (let i = 0; i < issuer.publicKeys.length; i++) {
        updates.push(`SET #kid${i} = :kid${i}`);
        expressionNames[`#kid${i}`] = `kid${i}`;
        expressionValues[`:kid${i}`] = { S: issuer.publicKeys[i].kid };
        updates.push(`SET #publicKey${i} = :publicKey${i}`);
        expressionNames[`#publicKey${i}`] = `publicKey${i}`;
        expressionValues[`:publicKey${i}`] = { S: issuer.publicKeys[i].publicKey };
      }
    }

    const options = {
      update: updates.join(),
      expressionNames,
      expressionValues,
      returnOld: true,
    };

    const key = toDynamoKey(accountId, issuer.id);
    const item = await this.dynamo.updateItem(tableName, key, options);
    mergeFromDynamoItem(issuer, item);
    return issuer;
  }

  public async getIssuer(accountId: string, issuerId: string): Promise<IIssuer | undefined> {
    const key = toDynamoKey(accountId, issuerId);
    const item = await this.dynamo.getItem(tableName, key);
    return item !== undefined ? fromDynamoItem(item) : undefined;
  }

  public async listIssuers(accountId: string, options?: IListIssuersOptions): Promise<IListIssuersResult> {
    const next = options && options.next ? options.next : undefined;
    const displayNameContains = options && options.displayNameContains ? options.displayNameContains : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit < maxLimit ? limit : maxLimit;

    const filters = [];
    const expressionNames: any = { '#accountId': 'accountId' };
    const expressionValues: any = {
      ':accountId': { S: accountId },
    };

    if (displayNameContains) {
      filters.push('contains(#displayName, :displayName)');
      expressionNames['#displayName'] = 'displayName';
      expressionValues[':displayName'] = { S: displayNameContains };
    }

    const queryOptions = {
      expressionNames,
      expressionValues,
      keyCondtion: '#accountId = :accountId',
      limit: limit || undefined,
      next: next || undefined,
      filter: filters.length ? filters.join(' and ') : undefined,
    };

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    const items = result.items.map(fromDynamoItem);
    return {
      next: result.next || undefined,
      items,
    };
  }

  public async removeIssuer(accountId: string, issuerId: string): Promise<void> {
    const key = toDynamoKey(accountId, issuerId);
    return this.dynamo.deleteItem(tableName, key);
  }
}
