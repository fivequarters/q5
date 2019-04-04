import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { random } from '@5qtrs/random';
import { toBase64, fromBase64 } from '@5qtrs/base64';
import { AccountDataError } from './AccountDataError';

// ------------------
// Internal Constants
// ------------------

const tableName = 'subscription';
const subscriptionIdLength = 16;
const defaultLimit = 25;
const maxLimit = 100;
const conditionalCheckFailed = 'ConditionalCheckFailed';

// ------------------
// Internal Functions
// ------------------

function generateSubscriptionId() {
  return `sub-${random({ lengthInBytes: subscriptionIdLength / 2 })}`;
}

function toDynamoKey(accountId: string, id: string) {
  return {
    id: { S: id },
    accountId: { S: accountId },
  };
}

function toDynamoItem(accountId: string, subscription: ISubscription) {
  const item: any = toDynamoKey(accountId, subscription.id);
  item.displayName = { S: subscription.displayName } || undefined;
  item.archived = { BOOL: subscription.archived || false };
  return item;
}

function mergeFromDynamoItem(subscription: ISubscription, item: any) {
  if (subscription.displayName === undefined && item.displayName) {
    subscription.displayName = item.displayName.S;
  }
}

function fromDynamoItem(item: any): ISubscription {
  const subscription: ISubscription = {
    id: item.id.S,
    displayName: item.displayName.S,
    archived: item.archived.BOOL !== false ? true : undefined,
  };
  return subscription;
}

function nextToMarker(next: any) {
  return next ? toBase64(next.id.S) : undefined;
}

function nextFromMarker(accountId: string, marker: string) {
  return marker ? toDynamoKey(accountId, fromBase64(marker)) : undefined;
}

// -------------------
// Exported Interfaces
// -------------------

export interface INewSubscription {
  archived?: boolean;
  displayName?: string;
}

export interface ISubscription extends INewSubscription {
  id: string;
}

export interface IGetSubscriptionOptions {
  includeArchived?: boolean;
}

export interface IListSubscriptionsOptions {
  next?: string;
  limit?: number;
  displayNameContains?: string;
  includeArchived?: boolean;
}

export interface IListSubscriptionsResult {
  next?: string;
  items: ISubscription[];
}

// ----------------
// Exported Classes
// ----------------

export class SubscriptionTable {
  private dynamo: AwsDynamo;

  private constructor(dynamo: AwsDynamo) {
    this.dynamo = dynamo;
  }

  public static async create(dynamo: AwsDynamo) {
    return new SubscriptionTable(dynamo);
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

  public async add(accountId: string, newSubscription: INewSubscription): Promise<ISubscription> {
    const options = {
      expressionNames: { '#accountId': 'accountId', '#subscriptionId': 'subscriptionId' },
      condition: 'attribute_not_exists(#accountId) and attribute_not_exists(#subscriptionId)',
      onCollision: (item: any) => {
        item.subscriptionId.S = generateSubscriptionId();
        return item;
      },
    };

    const subscription = {
      id: generateSubscriptionId(),
      displayName: newSubscription.displayName,
    };

    let item = toDynamoItem(accountId, subscription);
    try {
      item = await this.dynamo.addItem(tableName, item, options);
    } catch (error) {
      if (error.code === conditionalCheckFailed) {
        throw AccountDataError.noAccount(accountId);
      }
      throw AccountDataError.databaseError(tableName, 'add', error);
    }

    return fromDynamoItem(item);
  }

  public async get(
    accountId: string,
    subscriptionId: string,
    options?: IGetSubscriptionOptions
  ): Promise<ISubscription> {
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const key = toDynamoKey(accountId, subscriptionId);

    let item;
    try {
      item = await this.dynamo.getItem(tableName, key);
    } catch (error) {
      throw AccountDataError.databaseError(tableName, 'get', error);
    }

    if (item) {
      const subscription = fromDynamoItem(item);
      if (!includeArchived || subscription.archived) {
        return subscription;
      }
    }

    throw AccountDataError.noSubscription(subscriptionId);
  }

  public async list(accountId: string, options?: IListSubscriptionsOptions): Promise<IListSubscriptionsResult> {
    const next = options && options.next ? nextFromMarker(accountId, options.next) : undefined;
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const displayNameContains = options && options.displayNameContains ? options.displayNameContains : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit > maxLimit ? maxLimit : limit;

    const filters = [];
    const expressionNames: any = { '#accountId': 'accountId' };
    const expressionValues: any = { ':accountId': { S: accountId } };

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

    const queryOptions = {
      expressionNames,
      expressionValues,
      keyCondition: '#accountId = :accountId',
      next: next || undefined,
      filter: filters.length ? filters.join(' and ') : undefined,
    };

    let result;
    try {
      result = await this.dynamo.queryTable(tableName, queryOptions);
    } catch (error) {
      if (error.code === conditionalCheckFailed) {
        throw AccountDataError.noAccount(accountId);
      }
      throw AccountDataError.databaseError(tableName, 'list', error);
    }

    return {
      next: result.next ? nextToMarker(result.next) : undefined,
      items: result.items.map(fromDynamoItem),
    };
  }

  public async update(accountId: string, subscription: ISubscription): Promise<ISubscription> {
    const updates = [];
    const expressionNames: any = { '#archived': 'archived' };
    const expressionValues: any = { ':archived': { BOOL: true } };
    if (subscription.displayName) {
      updates.push('#displayName = :displayName');
      expressionNames['#displayName'] = 'displayName';
      expressionValues[':displayName'] = { S: subscription.displayName };
    }

    const options = {
      update: `SET ${updates.join(', ')}`,
      condtion: '#archived = :archived',
      expressionNames,
      expressionValues,
      returnOld: true,
    };

    const key = toDynamoKey(accountId, subscription.id);
    let item;
    try {
      item = await this.dynamo.updateItem(tableName, key, options);
    } catch (error) {
      if (error.code === conditionalCheckFailed) {
        throw AccountDataError.noSubscription(subscription.id);
      }
      throw AccountDataError.databaseError(tableName, 'update', error);
    }

    mergeFromDynamoItem(subscription, item);
    return subscription;
  }

  public async archive(accountId: string, subscriptionId: string): Promise<boolean> {
    let archived;
    try {
      archived = await this.setArchived(accountId, subscriptionId, true);
    } catch (error) {
      throw AccountDataError.databaseError(tableName, 'archive', error);
    }
    return archived;
  }

  public async unArchive(accountId: string, subscriptionId: string): Promise<boolean> {
    let unArchived;
    try {
      unArchived = await this.setArchived(accountId, subscriptionId, false);
    } catch (error) {
      throw AccountDataError.databaseError(tableName, 'unArchive', error);
    }
    return unArchived;
  }

  private async setArchived(accountId: string, subscriptionId: string, archived: boolean): Promise<boolean> {
    const options = {
      update: 'SET #archived = :archived',
      expressionNames: { '#archived': 'archived' },
      expressionValues: { ':archived': { BOOL: archived } },
      returnOld: true,
    };

    const key = toDynamoKey(accountId, subscriptionId);
    const oldValues = await this.dynamo.updateItem(tableName, key, options);
    return oldValues.archived && oldValues.archived.BOOL !== archived;
  }
}
