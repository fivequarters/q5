import { DynamoDB } from 'aws-sdk';
import create_error from 'http-errors';

import * as Constants from '@5qtrs/constants';

import { IFunctionApiRequest } from './Request';

const MAX_CACHE_REFRESH_TTL = 60 * 1000; // Don't refresh more often than once a minute.

interface ISubscription {
  accountId: string;
  displayName: string;
}

interface ISubscriptionCache {
  [subscriptionId: string]: ISubscription;
}

const loadSubscription = (cache: SubscriptionCache) => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    try {
      const sub = await cache.find(req.params.subscriptionId);
      if (!sub) {
        return next(create_error(404, 'subscription not found'));
      }

      req.params.accountId = sub.accountId;
      return next();
    } catch (e) {
      return next(e);
    }
  };
};

class SubscriptionCache {
  protected cache: ISubscriptionCache = {};
  protected cacheRefreshTtl: number;
  protected dynamo: DynamoDB;

  constructor(options: any) {
    this.dynamo =
      options.dynamo ||
      new DynamoDB({
        apiVersion: '2012-08-10',
        httpOptions: {
          timeout: 5000,
        },
        maxRetries: 3,
      });
    this.cacheRefreshTtl = 0;
  }

  public async find(key: string): Promise<ISubscription | undefined> {
    try {
      const result = this.cache[key];
      if (result) {
        return result;
      }

      await this.refresh();
    } catch (e) {
      return undefined;
    }

    // May still fail if the entry isn't found in the cache.
    return this.cache[key];
  }

  public async refresh() {
    if (this.cacheRefreshTtl > Date.now()) {
      return;
    }

    const params = {
      TableName: Constants.get_subscription_table_name(process.env.DEPLOYMENT_KEY as string),
    };

    const results = await Constants.dynamoScanTable(this.dynamo, params, (entry: any) => {
      // Valid DynamoDB record according to typescript?
      if (
        !entry.accountId ||
        !entry.accountId.S ||
        !entry.subscriptionId ||
        !entry.subscriptionId.S ||
        !entry.displayName ||
        !entry.displayName.S
      ) {
        return;
      }

      return { subscriptionId: entry.subscriptionId.S, accountId: entry.accountId.S, displayName: entry.displayName.S };
    });

    // Don't throw away the cache if the dynamo lookup returned no items.
    if (!results.length) {
      return;
    }

    // Clear the cache
    this.cache = {};

    // Populate it with the new items found
    results.forEach((entry: any) => {
      this.cache[entry.subscriptionId] = { accountId: entry.accountId, displayName: entry.displayName };
    });

    console.log(`CACHE: Subscription cache refreshed: ${results.length} subscriptions loaded`);
  }

  // Fastest way to see if a javascript dictionary has any members.
  public healthCheck() {
    for (const i in this.cache) {
      return true;
    }
    throw new Error('subscription cache not loaded');
  }
}

export { SubscriptionCache, loadSubscription };
