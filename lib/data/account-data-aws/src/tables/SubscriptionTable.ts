import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { AccountDataException } from '@5qtrs/account-data';
import { AccountDataAwsConfig } from '../AccountDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'subscription',
  attributes: { accountId: 'S', subscriptionId: 'S' },
  keys: ['accountId', 'subscriptionId'],
  archive: true,
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(subscriptionId: string, accountId: string) {
  return {
    subscriptionId: { S: subscriptionId },
    accountId: { S: accountId },
  };
}

function toItem(subscription: ISubscription, accountId: string) {
  const item: any = toKey(subscription.id, accountId);
  item.displayName = { S: subscription.displayName } || undefined;
  item.limits = { S: JSON.stringify(subscription.limits || {}) };
  item.flags = { S: JSON.stringify(subscription.flags || {}) };
  return item;
}

function fromItem(item: any): ISubscription {
  return {
    id: item.subscriptionId.S,
    displayName: item.displayName.S,
    limits: JSON.parse(item.limits ? item.limits.S : '{}'),
    flags: JSON.parse(item.flags ? item.flags.S : '{}'),
  };
}

function getConfig(config: AccountDataAwsConfig) {
  return () => ({
    defaultLimit: config.subscriptionDefaultLimit,
    maxLimit: config.subscriptionMaxLimit,
  });
}

function onSubscriptionAlreadyExists(subscription: ISubscription) {
  throw AccountDataException.subscriptionAlreadyExists(subscription.id);
}

function onNoSubscription(subscriptionId: string) {
  throw AccountDataException.noSubscription(subscriptionId);
}

// -------------------
// Exported Interfaces
// -------------------

export interface ISubscription {
  id: string;
  archived?: boolean;
  displayName?: string;
  limits?: ISubscriptionLimits;
  flags?: ISubscriptionFlags;
}

export interface IListSubscriptionsOptions {
  next?: string;
  limit?: number;
  displayNameContains?: string;
}

export interface IListSubscriptionsResult {
  next?: string;
  items: ISubscription[];
}

export interface ISubscriptionLimits {
  concurrency: number;
}

export interface ISubscriptionFlags {
  staticIp?: boolean;
}

// ----------------
// Exported Classes
// ----------------

export class SubscriptionTable extends AwsDynamoTable {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    return new SubscriptionTable(config, dynamo);
  }

  private constructor(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
  }

  public async add(accountId: string, subscription: ISubscription): Promise<void> {
    const options = { onConditionCheckFailed: onSubscriptionAlreadyExists, context: accountId };
    return this.addItem(subscription, options);
  }

  public async get(accountId: string, subscriptionId: string): Promise<ISubscription> {
    const options = { onNotFound: onNoSubscription, context: accountId };
    return this.getItem(subscriptionId, options);
  }

  public async list(accountId: string, options?: IListSubscriptionsOptions): Promise<IListSubscriptionsResult> {
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

  public async update(accountId: string, subscription: ISubscription): Promise<ISubscription> {
    const sets = [];
    const expressionValues: any = {};
    if (subscription.displayName) {
      sets.push('displayName = :displayName');
      expressionValues[':displayName'] = { S: subscription.displayName };
    }

    if (subscription.limits !== undefined) {
      sets.push('limits = :limits');
      expressionValues[':limits'] = { S: JSON.stringify(subscription.limits) };
    }

    if (subscription.flags !== undefined) {
      sets.push('flags = :flags');
      expressionValues[':flags'] = { S: JSON.stringify(subscription.flags) };
    }

    const options = {
      sets,
      expressionValues,
      context: accountId,
      onConditionCheckFailed: onNoSubscription,
    };

    return this.updateItem(subscription.id, options);
  }

  public async archive(accountId: string, subscriptionId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoSubscription, context: accountId };
    await this.archiveItem(subscriptionId, options);
  }

  public async unarchive(accountId: string, subscriptionId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoSubscription, context: accountId };
    await this.unarchiveItem(subscriptionId, options);
  }
}
