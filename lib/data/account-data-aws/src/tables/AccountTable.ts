import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { AccountDataException } from '@5qtrs/account-data';
import { AccountDataAwsConfig } from '../AccountDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'account',
  attributes: { accountId: 'S' },
  keys: ['accountId'],
  archive: true,
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(id: string) {
  return {
    accountId: { S: id },
  };
}

function toItem(account: IAccount) {
  const item: any = toKey(account.id);
  item.displayName = account.displayName ? { S: account.displayName } : undefined;
  item.primaryEmail = account.primaryEmail ? { S: account.primaryEmail } : undefined;
  item.disabled = account.disabled ? { BOOL: account.disabled } : { BOOL: false };
  item.disabledOn = account.disabledOn ? { S: account.disabledOn } : undefined;
  return item;
}

function fromItem(item: any): IAccount {
  return {
    id: item.accountId.S,
    displayName: item.displayName ? item.displayName.S : undefined,
    primaryEmail: item.primaryEmail ? item.primaryEmail.S : undefined,
    disabled: item.disabled ? item.disabled.BOOL : false,
    disabledOn: item.disabledOn ? item.disabledOn.S : undefined,
  };
}

function getConfig(config: AccountDataAwsConfig) {
  return () => ({
    defaultLimit: config.accountDefaultLimit,
    maxLimit: config.accountMaxLimit,
  });
}

function onAccountAlreadyExists(account: IAccount) {
  throw AccountDataException.accountAlreadyExists(account.id);
}

function onNoAccount(accountId: string) {
  throw AccountDataException.noAccount(accountId);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAccount {
  id: string;
  displayName?: string;
  primaryEmail?: string;
  disabled?: boolean;
  disabledOn?: string;
}

export interface IListAccountsOptions {
  next?: string;
  limit?: number;
  displayNameContains?: string;
  primaryEmailContains?: string;
}

export interface IListAccountsResult {
  next?: string;
  items: IAccount[];
}

// ----------------
// Exported Classes
// ----------------

export class AccountTable extends AwsDynamoTable {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    return new AccountTable(config, dynamo);
  }

  private constructor(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
  }

  public async add(account: IAccount): Promise<void> {
    const options = { onConditionCheckFailed: onAccountAlreadyExists };
    return this.addItem(account, options);
  }

  public async get(accountId: string): Promise<IAccount> {
    const options = { onNotFound: onNoAccount };
    return this.getItem(accountId, options);
  }

  public async list(options?: IListAccountsOptions): Promise<IListAccountsResult> {
    const filters = [];
    const expressionValues: any = {};

    if (options) {
      if (options.displayNameContains) {
        filters.push('contains(displayName, :displayName)');
        expressionValues[':displayName'] = { S: options.displayNameContains };
      }

      if (options.primaryEmailContains) {
        filters.push('contains(primaryEmail, :primaryEmail)');
        expressionValues[':primaryEmail'] = { S: options.primaryEmailContains };
      }
    }

    const scanOptions = {
      next: options && options.next ? options.next : undefined,
      limit: options && options.limit ? options.limit : undefined,
      expressionValues,
      filters,
    };

    return this.scanTable(scanOptions);
  }

  public async update(account: IAccount): Promise<IAccount> {
    const sets = [];
    const expressionValues: any = {};
    if (account.displayName) {
      sets.push('displayName = :displayName');
      expressionValues[':displayName'] = { S: account.displayName };
    }

    if (account.primaryEmail) {
      sets.push('primaryEmail = :primaryEmail');
      expressionValues[':primaryEmail'] = { S: account.primaryEmail };
    }

    if (account.disabled) {
      sets.push('disabled = :disabled');
      expressionValues[':disabled'] = { BOOL: account.disabled };
      sets.push('disabledOn = :disabledOn');
      expressionValues[':disabledOn'] = account.disabled ? { S: new Date().toISOString() } : { S: '' };
    }

    const options = {
      sets,
      expressionValues,
      onConditionCheckFailed: onNoAccount,
    };

    return this.updateItem(account.id, options);
  }

  public async archive(accountId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoAccount };
    await this.archiveItem(accountId, options);
  }

  public async unarchive(accountId: string): Promise<void> {
    const options = { onConditionCheckFailed: onNoAccount };
    await this.unarchiveItem(accountId, options);
  }
}
