import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { AccountDataException } from '@5qtrs/account-data';
import { AccountDataAwsConfig } from '../AccountDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'issuer',
  attributes: { accountId: 'S', issuerId: 'S' },
  keys: ['accountId', 'issuerId'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(issuerId: string, accountId: string) {
  return {
    accountId: { S: accountId },
    issuerId: { S: issuerId },
  };
}

function toItem(issuer: IIssuer, accountId: string) {
  const item: any = toKey(issuer.id, accountId);
  item.displayName = issuer.displayName ? { S: issuer.displayName } : undefined;
  item.jsonKeysUrl = issuer.jsonKeysUrl ? { S: issuer.jsonKeysUrl } : undefined;
  item.publicKeys = toItemPublicKeys(issuer.publicKeys);
  return item;
}

function fromItem(item: any): IIssuer {
  return {
    id: item.issuerId.S,
    displayName: item.displayName ? item.displayName.S : undefined,
    jsonKeysUrl: item.jsonKeysUrl ? item.jsonKeysUrl.S : undefined,
    publicKeys: fromItemPublicKeys(item.publicKeys),
  };
}

function toItemPublicKeys(publicKeys?: IIssuerPublicKey[]): any {
  if (publicKeys && publicKeys.length) {
    return {
      L: publicKeys.map((key) => ({
        M: {
          publicKey: { S: key.publicKey },
          keyId: { S: key.keyId },
        },
      })),
    };
  }
  return undefined;
}

function fromItemPublicKeys(items?: any): IIssuerPublicKey[] | undefined {
  if (items && items.L) {
    return items.L.map((item: any) => ({
      publicKey: item.M && item.M.publicKey ? item.M.publicKey.S : undefined,
      keyId: item.M && item.M.keyId ? item.M.keyId.S : undefined,
    }));
  }
  return undefined;
}

function getConfig(config: AccountDataAwsConfig) {
  return () => ({
    defaultLimit: config.issuerDefaultLimit,
    maxLimit: config.issuerMaxLimit,
  });
}

function issuerAlreadyExists(issuer: IIssuer) {
  throw AccountDataException.issuerAlreadyExists(issuer.id);
}

function onNoIssuer(issuerId: string) {
  throw AccountDataException.noIssuer(issuerId);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IIssuerPublicKey {
  keyId: string;
  publicKey: string;
}

export interface IIssuer {
  id: string;
  displayName?: string;
  jsonKeysUrl?: string;
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

export class IssuerTable extends AwsDynamoTable {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    return new IssuerTable(config, dynamo);
  }

  private constructor(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
  }

  public async add(accountId: string, issuer: IIssuer): Promise<void> {
    const options = { onConditionCheckFailed: issuerAlreadyExists, context: accountId };
    await this.addItem(issuer, options);
  }

  public async get(accountId: string, issuerId: string): Promise<IIssuer> {
    const options = { onNotFound: onNoIssuer, context: accountId };
    return this.getItem(issuerId, options);
  }

  public async list(accountId: string, options?: IListIssuersOptions): Promise<IListIssuersResult> {
    const filters = [];
    const keyConditions = ['accountId = :accountId'];
    const expressionValues: any = { ':accountId': { S: accountId } };

    if (options && options.displayNameContains) {
      filters.push('contains(displayName, :displayName)');
      expressionValues[':displayName'] = { S: options.displayNameContains };
    }

    const queryOptions = {
      next: options && options.next ? options.next : undefined,
      limit: options && options.limit ? options.limit : undefined,
      expressionValues,
      keyConditions,
      filters,
    };

    return this.queryTable(queryOptions);
  }

  public async update(accountId: string, issuer: IIssuer): Promise<IIssuer> {
    const sets = [];
    const removes = [];
    const expressionValues: any = {};
    if (issuer.displayName) {
      sets.push('displayName = :displayName');
      expressionValues[':displayName'] = { S: issuer.displayName };
    }

    if (issuer.jsonKeysUrl) {
      sets.push('jsonKeysUrl = :jsonKeysUrl');
      expressionValues[':jsonKeysUrl'] = { S: issuer.jsonKeysUrl };
      removes.push('publicKeys');
    }

    if (issuer.publicKeys) {
      sets.push('publicKeys = :publicKeys');
      expressionValues[':publicKeys'] = toItemPublicKeys(issuer.publicKeys);
      removes.push('jsonKeysUrl');
    }

    if (!sets.length) {
      return this.get(accountId, issuer.id);
    }

    const options = {
      sets,
      removes,
      expressionValues,
      context: accountId,
      onConditionCheckFailed: onNoIssuer,
    };

    return this.updateItem(issuer.id, options);
  }

  public async delete(accountId: string, issuerId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoIssuer, context: accountId };
    await this.deleteItem(issuerId, options);
  }
}
