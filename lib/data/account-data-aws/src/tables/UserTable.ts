import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { AccountDataException } from '@5qtrs/account-data';
import { AccountDataAwsConfig } from '../AccountDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'user',
  attributes: { accountId: 'S', userId: 'S' },
  keys: ['accountId', 'userId'],
  archive: true,
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(userId: string, accountId: string) {
  return {
    accountId: { S: accountId },
    userId: { S: userId },
  };
}

function toItem(user: IUser, accountId: string) {
  const item: any = toKey(user.id, accountId);
  item.firstName = user.firstName ? { S: user.firstName } : undefined;
  item.lastName = user.lastName ? { S: user.lastName } : undefined;
  item.primaryEmail = user.primaryEmail ? { S: user.primaryEmail } : undefined;
  return item;
}

function fromItem(item: any): IUser {
  return {
    id: item.userId.S,
    firstName: item.firstName ? item.firstName.S : undefined,
    lastName: item.lastName ? item.lastName.S : undefined,
    primaryEmail: item.primaryEmail ? item.primaryEmail.S : undefined,
  };
}

function getConfig(config: AccountDataAwsConfig) {
  return () => ({
    defaultLimit: config.userDefaultLimit,
    maxLimit: config.userMaxLimit,
  });
}

function onUserAlreadyExists(user: IUser) {
  throw AccountDataException.agentAlreadyExists(user.id);
}

function onNoUser(userId: string) {
  throw AccountDataException.noAgent(userId);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IUser {
  id: string;
  firstName?: string;
  lastName?: string;
  primaryEmail?: string;
}

export interface IListUsersOptions {
  next?: string;
  limit?: number;
  nameContains?: string;
  primaryEmailContains?: string;
}

export interface IListUsersResult {
  next?: string;
  items: IUser[];
}

// ----------------
// Exported Classes
// ----------------

export class UserTable extends AwsDynamoTable {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    return new UserTable(config, dynamo);
  }

  private constructor(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
  }

  public async add(accountId: string, user: IUser): Promise<void> {
    const options = { onConditionCheckFailed: onUserAlreadyExists, context: accountId };
    return this.addItem(user, options);
  }

  public async get(accountId: string, userId: string): Promise<IUser> {
    const options = { onNotFound: onNoUser, context: accountId };
    return this.getItem(userId, options);
  }

  public async getAll(accountId: string, userIds: string[]): Promise<IUser[]> {
    const options = { onNotFound: onNoUser, context: accountId };
    return this.getAllItems(userIds, options);
  }

  public async list(accountId: string, options?: IListUsersOptions): Promise<IListUsersResult> {
    const filters = [];
    const keyConditions = ['accountId = :accountId'];
    const expressionValues: any = { ':accountId': { S: accountId } };

    if (options) {
      if (options.nameContains) {
        filters.push('(contains(lastName, :name) or contains(firstName, :name))');
        expressionValues[':name'] = { S: options.nameContains };
      }

      if (options.primaryEmailContains) {
        filters.push('contains(primaryEmail, :primaryEmail)');
        expressionValues[':primaryEmail'] = { S: options.primaryEmailContains };
      }
    }

    const queryOptions = {
      next: options && options.next ? options.next : undefined,
      limit: options && options.limit ? options.limit : undefined,
      keyConditions,
      expressionValues,
      filters,
    };

    return this.queryTable(queryOptions);
  }

  public async update(accountId: string, user: IUser): Promise<IUser> {
    const sets = [];
    const expressionValues: any = {};

    if (user.firstName) {
      sets.push('firstName = :firstName');
      expressionValues[':firstName'] = { S: user.firstName };
    }

    if (user.lastName) {
      sets.push('lastName = :lastName');
      expressionValues[':lastName'] = { S: user.lastName };
    }

    if (user.primaryEmail) {
      sets.push('primaryEmail = :primaryEmail');
      expressionValues[':primaryEmail'] = { S: user.primaryEmail };
    }

    if (!sets.length) {
      return this.get(accountId, user.id);
    }

    const options = {
      sets,
      expressionValues,
      context: accountId,
      onConditionCheckFailed: onNoUser,
    };

    return this.updateItem(user.id, options);
  }

  public async delete(accountId: string, userId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoUser, context: accountId };
    return this.deleteItem(userId, options);
  }

  public async archive(accountId: string, userId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoUser, context: accountId };
    await this.archiveItem(userId, options);
  }

  public async unarchive(accountId: string, userId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoUser, context: accountId };
    await this.unarchiveItem(userId, options);
  }
}
