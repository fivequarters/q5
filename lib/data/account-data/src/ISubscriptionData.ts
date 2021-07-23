import { IDataSource } from '@5qtrs/data';

// -------------------
// Exported Interfaces
// -------------------

export interface ISubscription {
  id?: string;
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
  [key: string]: string;
}

export interface ISubscriptionData extends IDataSource {
  add(accountId: string, subscription: ISubscription): Promise<ISubscription>;
  get(accountId: string, subscriptionId: string): Promise<ISubscription>;
  list(accountId: string, options?: IListSubscriptionsOptions): Promise<IListSubscriptionsResult>;
  update(accountId: string, subscription: ISubscription): Promise<ISubscription>;
  delete(accountId: string, subscriptionId: string): Promise<void>;
}
