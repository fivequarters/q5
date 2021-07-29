// -------------------
// Exported Interfaces
// -------------------

export interface IInitAdmin {
  deploymentName: string;
  region: string;
  account: string;
  subscription?: string;
  first?: string;
  last?: string;
  email?: string;
  initToken?: string;
}

export interface IFusebitSubscription {
  deploymentName: string;
  region: string;
  account?: string;
  accountName?: string;
  accountEmail?: string;
  subscriptionName?: string;
  subscription?: string;
  limits?: IFusebitSubscriptionLimits;
  flags?: IFusebitSubscriptionFlags;
}

export interface IFusebitSubscriptionLimits {
  concurrency: number;
}

export interface IFusebitSubscriptionFlags {
  [key: string]: string;
}

export interface IFusebitSubscriptionDetails {
  id: string;
  displayName?: string;
  limits?: IFusebitSubscriptionLimits;
}

export interface IFusebitAccount {
  id: string;
  primaryEmail?: string;
  displayName?: string;
  subscriptions: IFusebitSubscriptionDetails[];
}
