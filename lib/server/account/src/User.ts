import { cancelOnError } from '@5qtrs/promise';
import {
  IAccountDataContext,
  IUser,
  IListUsersOptions,
  IListUsersResult,
  AccountDataException,
  AccountDataExceptionCode,
} from '@5qtrs/account-data';
import { AccountConfig } from './AccountConfig';
import { ResolvedAgent } from './ResolvedAgent';
import { IdFactory } from './IdFactory';
import { Init, IInitEntry } from './Init';

// ------------------
// Internal Functions
// ------------------

function ensureAuthorizedToGrantAccess(resolvedAgent: ResolvedAgent, user: IUser) {
  if (user.access && user.access.allow) {
    for (const accessEntry of user.access.allow) {
      if (!resolvedAgent.isAuthorized(accessEntry.action, accessEntry.resource)) {
        throw AccountDataException.unauthorizedToGrantAccess(
          resolvedAgent.id as string,
          accessEntry.action,
          accessEntry.resource
        );
      }
    }
  }
}

// ----------------
// Exported Classes
// ----------------

export class User {
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
    return new User(config, dataContext, idFactory);
  }

  public async add(resolvedAgent: ResolvedAgent, accountId: string, user: IUser): Promise<IUser> {
    ensureAuthorizedToGrantAccess(resolvedAgent, user);
    await this.dataContext.accountData.get(accountId);
    return this.addUser(accountId, user);
  }

  public async init(resolvedAgent: ResolvedAgent, initEntry: IInitEntry): Promise<string> {
    await this.get(resolvedAgent, initEntry.accountId, initEntry.agentId);
    const initHelper = await Init.create(this.config, this.dataContext);
    return initHelper.init(initEntry);
  }

  public async get(resolvedAgent: ResolvedAgent, accountId: string, userId: string): Promise<IUser> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const userPromise = this.dataContext.userData.get(accountId, userId);
    return cancelOnError(accountPromise, userPromise);
  }

  public async list(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    options?: IListUsersOptions
  ): Promise<IListUsersResult> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const userPromise = this.dataContext.userData.list(accountId, options);
    return cancelOnError(accountPromise, userPromise);
  }

  public async update(resolvedAgent: ResolvedAgent, accountId: string, user: IUser): Promise<IUser> {
    ensureAuthorizedToGrantAccess(resolvedAgent, user);
    const accountPromise = this.dataContext.accountData.get(accountId);
    const userPromise = this.dataContext.userData.update(accountId, user);

    return cancelOnError(accountPromise, userPromise);
  }

  public async delete(resolvedAgent: ResolvedAgent, accountId: string, userId: string): Promise<void> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const userPromise = this.dataContext.userData.delete(accountId, userId);

    return cancelOnError(accountPromise, userPromise);
  }

  private async addUser(accountId: string, user: IUser): Promise<IUser> {
    let tries = this.config.newClientTries;
    while (true) {
      try {
        user.id = this.idFactory.getUserId();
        user = await this.dataContext.userData.add(accountId, user);
        return user;
      } catch (error) {
        tries--;
        if (tries === 0 || error.code !== AccountDataExceptionCode.userAlreadyExists) {
          throw error;
        }
      }
    }
  }
}
