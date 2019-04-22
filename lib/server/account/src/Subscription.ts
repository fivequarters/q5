import { cancelOnError } from '@5qtrs/promise';
import {
  IAccountDataContext,
  ISubscription,
  IListSubscriptionsOptions,
  IListSubscriptionsResult,
  AccountDataExceptionCode,
} from '@5qtrs/account-data';
import { AccountConfig } from './AccountConfig';
import { ResolvedAgent } from './ResolvedAgent';
import { IdFactory } from './IdFactory';

// ----------------
// Exported Classes
// ----------------

export class Subscription {
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
    return new Subscription(config, dataContext, idFactory);
  }

  public async add(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    subscription: ISubscription
  ): Promise<ISubscription> {
    await this.dataContext.accountData.get(accountId);
    return this.addSubscription(accountId, subscription);
  }

  public async get(resolvedAgent: ResolvedAgent, accountId: string, subscriptionId: string): Promise<ISubscription> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const subscriptionPromise = this.dataContext.subscriptionData.get(accountId, subscriptionId);
    return cancelOnError(accountPromise, subscriptionPromise);
  }

  public async list(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    options?: IListSubscriptionsOptions
  ): Promise<IListSubscriptionsResult> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const subscriptionPromise = this.dataContext.subscriptionData.list(accountId, options);
    return cancelOnError(accountPromise, subscriptionPromise);
  }

  public async update(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    subscription: ISubscription
  ): Promise<ISubscription> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const subscriptionPromise = this.dataContext.subscriptionData.update(accountId, subscription);
    return cancelOnError(accountPromise, subscriptionPromise);
  }

  public async delete(resolvedAgent: ResolvedAgent, accountId: string, subscriptionId: string): Promise<void> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const subscriptionPromise = this.dataContext.subscriptionData.delete(accountId, subscriptionId);
    return cancelOnError(accountPromise, subscriptionPromise);
  }

  private async addSubscription(accountId: string, subscription: ISubscription): Promise<ISubscription> {
    let tries = this.config.newSubscriptionTries;
    while (true) {
      try {
        subscription.id = this.idFactory.getSubscriptionId();
        await this.dataContext.subscriptionData.add(accountId, subscription);
        return subscription;
      } catch (error) {
        tries--;
        if (tries === 0 || error.code !== AccountDataExceptionCode.subscriptionAlreadyExists) {
          throw error;
        }
      }
    }
  }
}
