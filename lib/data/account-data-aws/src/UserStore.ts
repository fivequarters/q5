import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { toBase64, fromBase64 } from '@5qtrs/base64';
import { random } from '@5qtrs/random';

// ------------------
// Internal Constants
// ------------------

const tableName = 'user';
const idLength = 16;
const defaultLimit = 25;
const maxLimit = 100;
const delimiter = ':';

// ------------------
// Internal Functions
// ------------------

function generateUserId() {
  return `usr-${random({ lengthInBytes: idLength / 2 })}`;
}

function toDynamoKey(accountId: string, userId: string) {
  return {
    accountId: { S: accountId },
    userId: { S: userId },
  };
}

function toDynamoItem(accountId: string, user: IBaseUser) {
  const item: any = toDynamoKey(accountId, user.id);
  item.firstName = user.firstName ? { S: user.firstName } : undefined;
  item.lastName = user.lastName ? { S: user.lastName } : undefined;
  item.primaryEmail = user.primaryEmail ? { S: user.primaryEmail } : undefined;
  item.archived = { BOOL: user.archived || false };
  return item;
}

function mergeFromDynamoItem(user: IBaseUser, item: any) {
  user.firstName = !user.firstName && item.firstName ? item.firstName.S : user.firstName || undefined;
  user.lastName = !user.lastName && item.lastName ? item.lastName.S : user.lastName || undefined;
  user.primaryEmail = !user.primaryEmail && item.primaryEmail ? item.primaryEmail.S : user.primaryEmail || undefined;
}

function fromDynamoItem(item: any): IBaseUser {
  const user: IBaseUser = {
    id: item.userId.S,
    archived: item.archived && item.archived.BOOL !== false ? true : undefined,
  };
  mergeFromDynamoItem(user, item);
  return user;
}

function nextToMarker(next: any) {
  return next ? toBase64([next.accountId.S, next.userId.S].join(delimiter)) : undefined;
}

function nextFromMarker(marker: string) {
  if (!marker) {
    return undefined;
  }
  const [accountId, userId] = fromBase64(marker).split(delimiter);
  return toDynamoKey(accountId, userId);
}

// -------------------
// Exported Interfaces
// -------------------

export interface INewBaseUser {
  archived?: boolean;
  firstName?: string;
  lastName?: string;
  primaryEmail?: string;
}

export interface IBaseUser extends INewBaseUser {
  id: string;
}

export interface IGetUserOptions {
  includeArchived?: boolean;
}

export interface IListBaseUsersOptions {
  next?: string;
  limit?: number;
  nameContains?: string;
  primaryEmailContains?: string;
  includeArchived?: boolean;
}

export interface IListUsersResult {
  next?: string;
  items: IBaseUser[];
}

// ----------------
// Exported Classes
// ----------------

export class UserStore {
  private dynamo: AwsDynamo;

  private constructor(dynamo: AwsDynamo) {
    this.dynamo = dynamo;
  }

  public static async create(dynamo: AwsDynamo) {
    return new UserStore(dynamo);
  }

  public async isSetup() {
    return this.dynamo.tableExists(tableName);
  }

  public async setup() {
    return this.dynamo.ensureTable({
      name: tableName,
      attributes: { accountId: 'S', userId: 'S' },
      keys: ['accountId', 'userId'],
    });
  }

  public async addUser(accountId: string, newUser: INewBaseUser): Promise<IBaseUser> {
    const options = {
      expressionNames: { '#userId': 'userId' },
      condition: 'attribute_not_exists(#userId)',
      onCollision: (item: any) => (item.userId.S = generateUserId()),
    };

    const user = {
      id: generateUserId(),
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      primaryEmail: newUser.primaryEmail,
      archived: false,
    };

    const item = toDynamoItem(accountId, user);
    const finalItem = await this.dynamo.addItem(tableName, item, options);
    return fromDynamoItem(finalItem);
  }

  public async updateUser(accountId: string, user: IBaseUser): Promise<IBaseUser | undefined> {
    const updates = [];
    const expressionNames: any = { '#archived': 'archived', '#userId': 'userId' };
    const expressionValues: any = { ':archived': { BOOL: false } };
    if (user.firstName) {
      updates.push('#firstName = :firstName');
      expressionNames['#firstName'] = 'firstName';
      expressionValues[':firstName'] = { S: user.firstName };
    }

    if (user.lastName) {
      updates.push('#lastName = :lastName');
      expressionNames['#lastName'] = 'lastName';
      expressionValues[':lastName'] = { S: user.lastName };
    }

    if (user.primaryEmail) {
      updates.push('#primaryEmail = :primaryEmail');
      expressionNames['#primaryEmail'] = 'primaryEmail';
      expressionValues[':primaryEmail'] = { S: user.primaryEmail };
    }

    const options = {
      update: updates.length ? `SET ${updates.join(', ')}` : undefined,
      condition: '#archived = :archived and attribute_exists(#userId)',
      expressionNames,
      expressionValues,
      returnOld: true,
    };

    const key = toDynamoKey(accountId, user.id);
    try {
      const item = await this.dynamo.updateItem(tableName, key, options);
      mergeFromDynamoItem(user, item);
      return user;
    } catch (error) {
      if (error.code !== 'ConditionalCheckFailedException') {
        throw error;
      }
    }

    return undefined;
  }

  public async archiveUser(accountId: string, userId: string): Promise<boolean> {
    return this.setArchived(accountId, userId, true);
  }

  public async unArchiveUser(accountId: string, userId: string): Promise<boolean> {
    return this.setArchived(accountId, userId, false);
  }

  public async getUser(accountId: string, userId: string, options?: IGetUserOptions): Promise<IBaseUser | undefined> {
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const key = toDynamoKey(accountId, userId);
    const item = await this.dynamo.getItem(tableName, key);
    if (item) {
      const user = fromDynamoItem(item);
      if (includeArchived || !user.archived) {
        return user;
      }
    }
    return undefined;
  }

  public async listUsers(accountId: string, options?: IListBaseUsersOptions): Promise<IListUsersResult> {
    const next = options && options.next ? options.next : undefined;
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const nameContains = options && options.nameContains ? options.nameContains : undefined;
    const primaryEmailContains = options && options.primaryEmailContains ? options.primaryEmailContains : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit < maxLimit ? limit : maxLimit;

    const filters = [];
    const expressionNames: any = { '#accountId': 'accountId' };
    const expressionValues: any = { ':accountId': { S: accountId } };

    if (!includeArchived) {
      filters.push('#archived = :archived');
      expressionNames['#archived'] = 'archived';
      expressionValues[':archived'] = { BOOL: false };
    }

    if (nameContains) {
      filters.push('(contains(#lastName, :name) or contains(#firstName, :name))');
      expressionNames['#lastName'] = 'lastName';
      expressionNames['#fistName'] = 'fistName';
      expressionValues[':name'] = { S: nameContains };
    }

    if (primaryEmailContains) {
      filters.push('contains(#primaryEmail, :email)');
      expressionNames['#primaryEmail'] = 'primaryEmail';
      expressionValues[':email'] = { S: primaryEmailContains };
    }

    const queryOptions = {
      expressionNames,
      expressionValues,
      keyCondition: '#accountId = :accountId',
      next: next ? nextFromMarker(next) : undefined,
      filter: filters.length ? filters.join(' and ') : undefined,
    };

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    const items = result.items.slice(0, limit);
    return {
      next: result.next || items.length === limit ? nextToMarker(items[items.length - 1]) : undefined,
      items: items.map(fromDynamoItem),
    };
  }

  private async setArchived(accountId: string, userId: string, archived: boolean): Promise<boolean> {
    const options = {
      update: 'SET #archived = :archived',
      expressionNames: { '#archived': 'archived' },
      expressionValues: { ':archived': { BOOL: archived } },
      returnOld: true,
    };

    const key = toDynamoKey(accountId, userId);
    const item = await this.dynamo.updateItem(tableName, key, options);
    if (!item) {
      return false;
    }
    const user = fromDynamoItem(item);
    return user.archived !== archived;
  }
}
