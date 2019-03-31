import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { random } from '@5qtrs/random';
import { toBase64, fromBase64 } from '@5qtrs/base64';

// ------------------
// Internal Constants
// ------------------

const tableName = 'account';
const accountIdLength = 16;
const subscriptionIdPostFixLength = 4;
const defaultLimit = 25;
const maxLimit = 100;
const baseAccountSubscriptionMarker = '<account>';
const rootAccountDisplayName = 'Root Account';
const conditionalCheckFailed = 'ConditionalCheckFailedException';

// ------------------
// Internal Functions
// ------------------

function generateAccountId() {
  return `acc-${random({ lengthInBytes: accountIdLength / 2 })}`;
}

function generateRootAccountId() {
  return 'acc-root';
}

function toDynamoKey(accountId: string, subscriptionId: string) {
  return {
    accountId: { S: accountId },
    subscriptionId: { S: subscriptionId },
  };
}

function accountToDynamoItem(account: IAccount) {
  const item: any = toDynamoKey(account.id, baseAccountSubscriptionMarker);
  item.displayName = account.displayName ? { S: account.displayName } : undefined;
  item.primaryEmail = account.primaryEmail ? { S: account.primaryEmail } : undefined;
  item.archived = { BOOL: account.archived || false };
  return item;
}

function mergeAccountFromDynamoItem(account: IAccount, item: any) {
  account.displayName =
    !account.displayName && item.displayName ? item.displayName.S : account.displayName || undefined;
  account.primaryEmail =
    !account.primaryEmail && item.primaryEmail ? item.primaryEmail.S : account.primaryEmail || undefined;
}

function accountFromDynamoItem(item: any): IAccount {
  const account: IAccount = { id: item.accountId.S, archived: item.archived.BOOL !== false ? true : undefined };
  mergeAccountFromDynamoItem(account, item);
  return account;
}

function generateSubscriptionId(accountId: string) {
  return `sub-${accountId.substring(4)}-${random({ lengthInBytes: subscriptionIdPostFixLength / 2 })}`;
}

function mergeSubscriptionFromDynamoItem(subscription: ISubscription, item: any) {
  subscription.displayName =
    !subscription.displayName && item.displayName ? item.displayName.S : subscription.displayName || undefined;
}

function subscriptionToDynamoItem(accountId: string, subscription: ISubscription) {
  const item: any = toDynamoKey(accountId, subscription.id);
  item.displayName = { S: subscription.displayName } || undefined;
  item.archived = { BOOL: subscription.archived || false };
  return item;
}

function subscriptionFromDynamoItem(item: any): IAccount {
  const subscription: ISubscription = {
    id: item.subscriptionId.S,
    archived: item.archived.BOOL !== false ? true : undefined,
  };
  mergeAccountFromDynamoItem(subscription, item);
  return subscription;
}

function filterOutAccount(item: any) {
  return item.subscriptionId.S !== baseAccountSubscriptionMarker;
}

function nextToMarker(next: any) {
  return next ? toBase64(next.subscriptionId.S.split('-')[2]) : undefined;
}

function nextFromMarker(accountId: string, marker: string) {
  return marker ? toDynamoKey(accountId, `sub-${accountId.substring(4)}-${fromBase64(marker)}`) : undefined;
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

export class AccountStore {
  private dynamo: AwsDynamo;

  private constructor(dynamo: AwsDynamo) {
    this.dynamo = dynamo;
  }

  public static async create(dynamo: AwsDynamo) {
    return new AccountStore(dynamo);
  }

  public async isSetup() {
    return this.dynamo.tableExists(tableName);
  }

  public async setup() {
    return this.dynamo.ensureTable({
      name: tableName,
      attributes: { accountId: 'S', subscriptionId: 'S' },
      keys: ['accountId', 'subscriptionId'],
    });
  }

  public async addRootAccount(): Promise<IAccount> {
    const options = {
      expressionNames: { '#accountId': 'accountId' },
      condition: 'attribute_not_exists(#accountId)',
    };

    const account = {
      id: generateRootAccountId(),
      displayName: rootAccountDisplayName,
    };

    const item = accountToDynamoItem(account);
    try {
      await this.dynamo.putItem(tableName, item, options);
    } catch (error) {
      if (error.code !== conditionalCheckFailed) {
        throw error;
      }
    }
    return accountFromDynamoItem(item);
  }

  public async addAccount(newAccount: INewAccount): Promise<IAccount> {
    const options = {
      expressionNames: { '#accountId': 'accountId' },
      condition: 'attribute_not_exists(#accountId)',
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

    const item = accountToDynamoItem(account);
    const finalItem = await this.dynamo.addItem(tableName, item, options);
    return accountFromDynamoItem(finalItem);
  }

  public async updateAccount(account: IAccount): Promise<IAccount> {
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

    const key = toDynamoKey(account.id, baseAccountSubscriptionMarker);
    const item = await this.dynamo.updateItem(tableName, key, options);
    mergeAccountFromDynamoItem(account, item);
    return account;
  }

  public async getAccount(accountId: string, options?: IGetAccountOptions): Promise<IAccount | undefined> {
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const key = toDynamoKey(accountId, baseAccountSubscriptionMarker);
    const item = await this.dynamo.getItem(tableName, key);
    if (item) {
      const account = accountFromDynamoItem(item);
      if (!includeArchived || account.archived) {
        return account;
      }
    }
    return undefined;
  }

  public async addSubscription(
    accountId: string,
    newSubscription: INewSubscription
  ): Promise<ISubscription | undefined> {
    const account = await this.getAccount(accountId);
    if (!account) {
      return undefined;
    }

    const options = {
      expressionNames: { '#subscriptionId': 'subscriptionId' },
      condition: 'attribute_not_exists(#subscriptionId)',
      onCollision: (item: any) => {
        item.subscriptionId.S = generateSubscriptionId(accountId);
        return item;
      },
    };

    const subscription = {
      id: generateSubscriptionId(accountId),
      displayName: newSubscription.displayName,
    };

    const item = subscriptionToDynamoItem(accountId, subscription);
    const finalItem = await this.dynamo.addItem(tableName, item, options);
    return subscriptionFromDynamoItem(finalItem);
  }

  public async updateSubscription(accountId: string, subscription: ISubscription): Promise<IAccount> {
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
    const item = await this.dynamo.updateItem(tableName, key, options);
    mergeSubscriptionFromDynamoItem(subscription, item);
    return subscription;
  }

  public async archiveSubscription(accountId: string, subscriptionId: string): Promise<void> {
    return this.setArchived(accountId, subscriptionId, true);
  }

  public async unArchiveSubscription(accountId: string, subscriptionId: string): Promise<void> {
    return this.setArchived(accountId, subscriptionId, false);
  }

  public async getSubscription(
    accountId: string,
    subscriptionId: string,
    options?: IGetSubscriptionOptions
  ): Promise<ISubscription | undefined> {
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const key = toDynamoKey(accountId, subscriptionId);
    const item = await this.dynamo.getItem(tableName, key);
    if (item) {
      const subscription = subscriptionFromDynamoItem(item);
      if (includeArchived || !subscription.archived) {
        return subscription;
      }
    }
    return undefined;
  }

  public async listSubscriptions(
    accountId: string,
    options?: IListSubscriptionsOptions
  ): Promise<IListSubscriptionsResult | undefined> {
    const next = options && options.next ? nextFromMarker(accountId, options.next) : undefined;
    const includeArchived = options && options.includeArchived !== undefined ? options.includeArchived : false;
    const displayNameContains = options && options.displayNameContains ? options.displayNameContains : undefined;
    let limit = options && options.limit ? options.limit : defaultLimit;
    limit = limit > maxLimit ? maxLimit : limit;

    // Because we may get the record that represents the account and not
    // a subscription; we need to ask for 1 more since we may be filtering
    // out the account-only record
    limit++;

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

    const result = await this.dynamo.queryTable(tableName, queryOptions);
    if (result.items.length) {
      const items = result.items
        .filter(filterOutAccount) // Filter out the account-only record
        .slice(0, limit - 1); // Or just drop the last record if we didn't get the account-only record

      return {
        next: items.length ? nextToMarker(items[items.length - 1]) : undefined,
        items: items.map(subscriptionFromDynamoItem),
      };
    }

    if (limit == undefined) {
      return undefined;
    }
    const account = await this.getAccount(accountId);
    return account ? { items: [] } : undefined;
  }

  private async setArchived(accountId: string, subscriptionId: string, archived: boolean): Promise<void> {
    const options = {
      update: 'SET #archived = :archived',
      expressionNames: { '#archived': 'archived' },
      expressionValues: { ':archived': { BOOL: archived } },
    };

    const key = toDynamoKey(accountId, subscriptionId);
    await this.dynamo.updateItem(tableName, key, options);
  }
}
