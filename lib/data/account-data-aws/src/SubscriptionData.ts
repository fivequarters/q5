import { DataSource } from '@5qtrs/data';
import {
  ISubscriptionData,
  ISubscription,
  IListSubscriptionsOptions,
  IListSubscriptionsResult,
  AccountDataException,
} from '@5qtrs/account-data';
import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { AccountDataAwsConfig } from './AccountDataAwsConfig';
import { SubscriptionTable, ISubscription as ISubscriptionWithId } from './tables/SubscriptionTable';

// ----------------
// Exported Classes
// ----------------

export class SubscriptionData extends DataSource implements ISubscriptionData {
  public static async create(config: AccountDataAwsConfig, dynamo: AwsDynamo) {
    const subscriptionTable = await SubscriptionTable.create(config, dynamo);
    return new SubscriptionData(subscriptionTable);
  }
  private subscriptionTable: SubscriptionTable;

  private constructor(subscriptionTable: SubscriptionTable) {
    super([subscriptionTable]);
    this.subscriptionTable = subscriptionTable;
  }

  public async add(accountId: string, subscription: ISubscription): Promise<ISubscription> {
    if (!subscription.id) {
      throw AccountDataException.idRequired('subscription', 'add');
    }
    await this.subscriptionTable.add(accountId, subscription as ISubscriptionWithId);
    return subscription;
  }

  public async get(accountId: string, subscriptionId: string): Promise<ISubscription> {
    return this.subscriptionTable.get(accountId, subscriptionId);
  }

  public async list(accountId: string, options?: IListSubscriptionsOptions): Promise<IListSubscriptionsResult> {
    return this.subscriptionTable.list(accountId, options);
  }

  public async update(accountId: string, subscription: ISubscription): Promise<ISubscription> {
    if (!subscription.id) {
      throw AccountDataException.idRequired('subscription', 'update');
    }
    return this.subscriptionTable.update(accountId, subscription as ISubscriptionWithId);
  }

  public async delete(accountId: string, subscriptionId: string): Promise<void> {
    return this.subscriptionTable.archive(accountId, subscriptionId);
  }
}
