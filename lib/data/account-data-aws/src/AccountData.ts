import { DataSource } from '@5qtrs/data';
import {
  IAccountData,
  IAccount,
  IListAccountsOptions,
  IListAccountsResult,
  AccountDataException,
} from '@5qtrs/account-data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';
import { AccountTable, IAccount as IAccountWithId } from './tables/AccountTable';

// ----------------
// Exported Classes
// ----------------

export class AccountData extends DataSource implements IAccountData {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    const accountTable = await AccountTable.create(config, dynamo);
    return new AccountData(accountTable);
  }
  private accountTable: AccountTable;

  private constructor(accountTable: AccountTable) {
    super([accountTable]);
    this.accountTable = accountTable;
  }

  public async add(account: IAccount): Promise<IAccount> {
    if (!account.id) {
      throw AccountDataException.idRequired('account', 'add');
    }
    await this.accountTable.add(account as IAccountWithId);
    return account;
  }

  public async get(accountId: string): Promise<IAccount> {
    return this.accountTable.get(accountId);
  }

  public async list(options?: IListAccountsOptions): Promise<IListAccountsResult> {
    return this.accountTable.list(options);
  }

  public async update(account: IAccount): Promise<IAccount> {
    if (!account.id) {
      throw AccountDataException.idRequired('account', 'update');
    }
    return this.accountTable.update(account as IAccountWithId);
  }

  public async delete(accountId: string): Promise<void> {
    return this.accountTable.archive(accountId);
  }
}
