import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { random } from '@5qtrs/random';
import { toBase64, fromBase64 } from '@5qtrs/base64';
import { AccountDataError } from './AccountDataError';

// ------------------
// Internal Constants
// ------------------

const tableName = 'account';
const accountIdLength = 16;
const defaultLimit = 25;
const maxLimit = 100;
const conditionalCheckFailed = 'ConditionalCheckFailed';

// ------------------
// Internal Functions
// ------------------

function generateAccountId() {
  return `acc-${random({ lengthInBytes: accountIdLength / 2 })}`;
}

function toDynamoKey(id: string) {
  return {
    id: { S: id },
  };
}

function toDynamoItem(account: IAccount) {
  const item: any = toDynamoKey(account.id);
  item.displayName = account.displayName ? { S: account.displayName } : undefined;
  item.primaryEmail = account.primaryEmail ? { S: account.primaryEmail } : undefined;
  item.archived = { BOOL: account.archived || false };
  return item;
}

function mergeFromDynamoItem(account: IAccount, item: any) {
  account.displayName =
    !account.displayName && item.displayName ? item.displayName.S : account.displayName || undefined;
  account.primaryEmail =
    !account.primaryEmail && item.primaryEmail ? item.primaryEmail.S : account.primaryEmail || undefined;
}

function fromDynamoItem(item: any): IAccount {
  const account: IAccount = { id: item.id.S, archived: item.archived.BOOL !== false ? true : undefined };
  mergeFromDynamoItem(account, item);
  return account;
}

function nextToMarker(next: any) {
  return next ? toBase64(next.accountId.S) : undefined;
}

function nextFromMarker(marker: string) {
  return marker ? toDynamoKey(fromBase64(marker)) : undefined;
}

// -------------------
// Exported Interfaces
// -------------------

export interface INewAccount {
  archived?: boolean;
  displayName?: string;
  primaryEmail?: string;
}

export interface IAccount extends INewAccount {
  id: string;
}

export interface IGetAccountOptions {
  includeArchived?: boolean;
}

export interface IListAccountsOptions {
  next?: string;
  limit?: number;
  displayNameContains?: string;
  primaryEmailContains?: string;
  includeArchived?: boolean;
}

export interface IListAccountsResult {
  next?: string;
  items: IAccount[];
}

// ----------------
// Exported Classes
// ----------------

export class AccountTable {
  private dynamo: AwsDynamo;

  private constructor(dynamo: AwsDynamo) {
    this.dynamo = dynamo;
  }

  public static async create(dynamo: AwsDynamo) {
    return new AccountTable(dynamo);
  }

  public async isSetup() {
    return this.dynamo.tableExists(tableName);
  }

  public async setup() {
    return this.dynamo.ensureTable({
      name: tableName,
      attributes: { id: 'S' },
      keys: ['id'],
    });
  }

  public async add(newAccount: INewAccount): Promise<IAccount> {
    const options = {
      expressionNames: { '#id': 'id' },
      condition: 'attribute_not_exists(#id)',
      onCollision: (item: any) => {
        item.accountId.S = generateAccountId();
        return item;
      },
    };

    const account = {
      id: generateAccountId(),
      displayName: newAccount.displayName,
      primaryEmail: newAccount.primaryEmail,
    };

    let item = toDynamoItem(account);
    try {
      item = await this.dynamo.addItem(tableName, item, options);
    } catch (error) {
      throw AccountDataError.databaseError(tableName, 'add', error);
    }

    return fromDynamoItem(item);
  }

  public async get(accountId: string, options?: IGetAccountOptions): Promise<IAccount> {
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const key = toDynamoKey(accountId);

    let item;
    try {
      item = await this.dynamo.getItem(tableName, key);
    } catch (error) {
      throw AccountDataError.databaseError(tableName, 'get', error);
    }

    if (item) {
      const account = fromDynamoItem(item);
      if (!includeArchived || account.archived) {
        return account;
      }
    }

    throw AccountDataError.noAccount(accountId);
  }

  public async list(options?: IListAccountsOptions): Promise<IListAccountsResult | undefined> {
    const next = options && options.next ? nextFromMarker(options.next) : undefined;
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const displayNameContains = options && options.displayNameContains ? options.displayNameContains : undefined;
    const primaryEmailContains = options && options.primaryEmailContains ? options.primaryEmailContains : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit > maxLimit ? maxLimit : limit;

    const filters = [];
    const expressionNames: any = {};
    const expressionValues: any = {};

    if (!includeArchived) {
      filters.push('#archived = :archived');
      expressionNames['#archived'] = 'archived';
      expressionValues[':archived'] = { BOOL: false };
    }

    if (displayNameContains) {
      filters.push('contains(#displayName, :displayName)');
      expressionNames['#displayName'] = 'displayName';
      expressionValues[':displayName'] = { S: displayNameContains };
    }

    if (primaryEmailContains) {
      filters.push('contains(#primaryEmail, :primaryEmail)');
      expressionNames['#primaryEmail'] = 'primaryEmail';
      expressionValues[':primaryEmail'] = { S: primaryEmailContains };
    }

    const scanOptions = {
      next: next || undefined,
      expressionNames: filters.length ? expressionNames : undefined,
      expressionValues: filters.length ? expressionValues : undefined,
      filter: filters.length ? filters.join(' and ') : undefined,
    };

    let result;
    try {
      result = await this.dynamo.scanTable(tableName, scanOptions);
    } catch (error) {
      throw AccountDataError.databaseError(tableName, 'list', error);
    }

    return {
      next: result.next ? nextToMarker(result.next) : undefined,
      items: result.items.map(fromDynamoItem),
    };
  }

  public async update(account: IAccount): Promise<IAccount> {
    const updates = [];
    const expressionNames: any = { '#archived': 'archived' };
    const expressionValues: any = { ':archived': { BOOL: true } };
    if (account.displayName) {
      updates.push('#displayName = :displayName');
      expressionNames['#displayName'] = 'displayName';
      expressionValues[':displayName'] = { S: account.displayName };
    }

    if (account.primaryEmail) {
      updates.push('#primaryEmail = :primaryEmail');
      expressionNames['#primaryEmail'] = 'primaryEmail';
      expressionValues[':primaryEmail'] = { S: account.primaryEmail };
    }

    const options = {
      update: `SET ${updates.join(', ')}`,
      condtion: '#archived = :archived',
      expressionNames,
      expressionValues,
      returnOld: true,
    };

    const key = toDynamoKey(account.id);
    let item;
    try {
      item = await this.dynamo.updateItem(tableName, key, options);
    } catch (error) {
      if (error.code === conditionalCheckFailed) {
        throw AccountDataError.noAccount(account.id);
      }
      throw AccountDataError.databaseError(tableName, 'update', error);
    }

    mergeFromDynamoItem(account, item);
    return account;
  }

  public async archive(accountId: string): Promise<boolean> {
    let archived;
    try {
      archived = await this.setArchived(accountId, true);
    } catch (error) {
      throw AccountDataError.databaseError(tableName, 'archive', error);
    }
    return archived;
  }

  public async unArchive(accountId: string): Promise<boolean> {
    let unArchived;
    try {
      unArchived = await this.setArchived(accountId, false);
    } catch (error) {
      throw AccountDataError.databaseError(tableName, 'unArchive', error);
    }
    return unArchived;
  }

  private async setArchived(accountId: string, archived: boolean): Promise<boolean> {
    const options = {
      update: 'SET #archived = :archived',
      expressionNames: { '#archived': 'archived' },
      expressionValues: { ':archived': { BOOL: archived } },
      returnOld: true,
    };

    const key = toDynamoKey(accountId);
    const oldValues = await this.dynamo.updateItem(tableName, key, options);
    return oldValues.archived && oldValues.archived.BOOL !== archived;
  }
}
