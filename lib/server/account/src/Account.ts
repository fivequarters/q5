import {
  IAccountDataContext,
  IAccount,
  IListAccountsOptions,
  IListAccountsResult,
  AccountDataExceptionCode,
} from '@5qtrs/account-data';
import { AccountConfig } from './AccountConfig';
import { ResolvedAgent } from './ResolvedAgent';
import { IdFactory } from './IdFactory';

// ----------------
// Exported Classes
// ----------------

export class Account {
  private config: AccountConfig;
  private dataContext: IAccountDataContext;
  private idFactory: IdFactory;

  private constructor(config: AccountConfig, dataContext: IAccountDataContext, idFactory: IdFactory) {
    this.config = config;
    this.dataContext = dataContext;
    this.idFactory = idFactory;
  }

  public static async create(config: AccountConfig, dataContext: IAccountDataContext) {
    const idFactory = await IdFactory.create(config);
    return new Account(config, dataContext, idFactory);
  }

  public async add(resolvedAgent: ResolvedAgent, account: IAccount): Promise<IAccount> {
    let tries = this.config.newAccountTries;
    while (true) {
      try {
        account.id = this.idFactory.getAccountId();
        await this.dataContext.accountData.add(account);
        return account;
      } catch (error) {
        tries--;
        if (tries === 0 || error.code !== AccountDataExceptionCode.userAlreadyExists) {
          throw error;
        }
      }
    }
  }

  public async get(resolvedAgent: ResolvedAgent, accountId: string): Promise<IAccount> {
    return this.dataContext.accountData.get(accountId);
  }

  public async list(resolvedAgent: ResolvedAgent, options?: IListAccountsOptions): Promise<IListAccountsResult> {
    return this.dataContext.accountData.list(options);
  }

  public async update(resolvedAgent: ResolvedAgent, account: IAccount): Promise<IAccount> {
    return this.dataContext.accountData.update(account);
  }

  public async delete(resolvedAgent: ResolvedAgent, accountId: string): Promise<void> {
    return this.dataContext.accountData.delete(accountId);
  }
}
