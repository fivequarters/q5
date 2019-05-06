import { AwsDynamo, IAwsDynamoTable, AwsDynamoTable } from '@5qtrs/aws-dynamo';
import { OpsDataException } from '@5qtrs/ops-data';
import { OpsDataAwsConfig } from '../OpsDataAwsConfig';

// ------------------
// Internal Constants
// ------------------

const table: IAwsDynamoTable = {
  name: 'aws-account',
  attributes: { accountName: 'S' },
  keys: ['accountName'],
  toKey,
  toItem,
  fromItem,
};

// ------------------
// Internal Functions
// ------------------

function toKey(accountName: string) {
  return {
    accountName: { S: accountName },
  };
}

function toItem(account: IOpsAccount) {
  const item: any = toKey(account.name);
  item.accountId = { S: account.id };
  item.role = account.role ? { S: account.role } : undefined;
  return item;
}

function fromItem(item: any): IOpsAccount {
  return {
    id: item.accountId.S,
    name: item.accountName.S,
    role: item.role ? item.role.S : '',
  };
}

function getConfig(config: OpsDataAwsConfig) {
  return () => ({
    defaultLimit: config.accountDefaultLimit,
    maxLimit: config.accountMaxLimit,
  });
}

function onAccountAlreadyExists(account: IOpsAccount) {
  throw OpsDataException.accountNameAlreadyExists(account.name);
}

function onAccountDoesNotExist(accountName: string) {
  throw OpsDataException.noAccountName(accountName);
}

// -------------------
// Exported Interfaces
// -------------------

export interface IOpsAccount {
  name: string;
  id: string;
  role: string;
}

export interface IListOpsAccountOptions {
  next?: string;
  limit?: number;
}

export interface IListOpsAccountResult {
  next?: string;
  items: IOpsAccount[];
}

// ----------------
// Exported Classes
// ----------------

export class AccountTable extends AwsDynamoTable {
  private config: OpsDataAwsConfig;

  public static async create(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    return new AccountTable(config, dynamo);
  }

  private constructor(config: OpsDataAwsConfig, dynamo: AwsDynamo) {
    table.getConfig = getConfig(config);
    super(table, dynamo);
    this.config = config;
  }

  public async add(account: IOpsAccount): Promise<void> {
    const options = { onConditionCheckFailed: onAccountAlreadyExists };
    return this.addItem(account, options);
  }

  public async get(accountName: string): Promise<IOpsAccount> {
    const options = { onNotFound: onAccountDoesNotExist };
    return this.getItem(accountName, options);
  }

  public async list(options?: IListOpsAccountOptions): Promise<IListOpsAccountResult> {
    return this.scanTable(options);
  }

  public async listAll(): Promise<IOpsAccount[]> {
    const accounts = [];
    const options: IListOpsAccountOptions = { limit: this.config.accountMaxLimit };
    do {
      const result = await this.list(options);
      accounts.push(...result.items);
      options.next = result.next;
    } while (options.next);
    return accounts;
  }
}
