import { DynamoDB, MetadataService } from 'aws-sdk';
import create_error from 'http-errors';

import { Request, Response, NextFunction } from 'express';

import * as Constants from '@5qtrs/constants';

import { IFunctionApiRequest } from './Request';

const MAX_METADATA_TIMEOUT = 1000;

interface ISubscription {
  accountId: string;
  displayName: string;
  [key: string]: any;
}

interface ISubscriptionCache {
  [subscriptionId: string]: ISubscription;
}

const loadSubscription = (cache: SubscriptionCache) => {
  return async (req: IFunctionApiRequest, res: Response, next: any) => {
    let sub;
    try {
      sub = await cache.find(req.params.subscriptionId);
    } catch (e) {
      return next(e);
    }

    if (!sub) {
      return next(create_error(404, 'subscription not found'));
    }
    req.subscription = sub;
    req.params.accountId = sub.accountId;
    return next();
  };
};

const refreshSubscription = (cache: SubscriptionCache) => {
  return async (req: IFunctionApiRequest, res: any, next: any) => {
    let when;
    try {
      when = await cache.refresh();
    } catch (error) {
      return next(create_error(501, error));
    }
    res.json({ cache: when }).send();
  };
};

class SubscriptionCache {
  protected cache: ISubscriptionCache = {};
  protected allowRefreshAfter: number;
  protected dynamo: DynamoDB;
  protected refreshedAt: number;

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
    this.allowRefreshAfter = 0;
    this.refreshedAt = 0;
  }

  public async find(key: string): Promise<ISubscription | undefined> {
    const result = this.cache[key];
    if (result) {
      return result;
    }

    await this.refresh();

    // May still fail if the entry isn't found in the cache.
    return this.cache[key];
  }

  public async refresh() {
    if (this.allowRefreshAfter > Date.now()) {
      return this.allowRefreshAfter;
    }

    const params = {
      TableName: Constants.get_subscription_table_name(process.env.DEPLOYMENT_KEY as string),
    };

    const results = await Constants.dynamoScanTable(this.dynamo, params, (entry: any) => {
      const result: { [name: string]: any } = {};
      Object.entries(entry).forEach((e) => {
        result[e[0]] = Object.values(entry[e[0]])[0];
      });

      // Deserialize the limits field, if present
      result.limits = result.limits && JSON.parse(result.limits);

      // Deserialize the flags field, if present
      result.flags = result.flags && JSON.parse(result.flags);

      return result;
    });

    // Don't throw away the cache if the dynamo lookup returned no items.
    if (!results.length) {
      return;
    }

    // Clear the cache
    this.cache = {};

    // Populate it with the new items found
    results.forEach((entry: any) => {
      this.cache[entry.subscriptionId] = entry;
    });

    console.log(`CACHE: Subscription cache refreshed: ${results.length} subscriptions loaded`);

    this.refreshedAt = Date.now();
    this.allowRefreshAfter = this.refreshedAt + Constants.MAX_CACHE_REFRESH_RATE;

    return this.allowRefreshAfter;
  }

  // Fastest way to see if a javascript dictionary has any members.
  public healthCheck() {
    for (const i in this.cache) {
      return true;
    }
    throw new Error('subscription cache not loaded');
  }

  public async requestRefresh(req: Request, res: Response, next: NextFunction) {
    let when;
    try {
      when = await this.refresh();
    } catch (error) {
      return next(create_error(501, error));
    }

    let instanceId: string = 'localhost';
    try {
      // Hit the aws metadata service to get the current instance id.
      const metadataService = new MetadataService({ httpOptions: { timeout: MAX_METADATA_TIMEOUT } });
      // Metadata service does not support .promise() :(
      instanceId = await new Promise<string>((res, rej) =>
        metadataService.request('/latest/meta-data/instance-id', (err, data) => {
          if (err) {
            rej(err);
          }

          res(data);
        })
      );
    } catch (e) {}

    res.json({ cache: when, who: instanceId, at: this.refreshedAt }).send();
  }
}

export { SubscriptionCache, loadSubscription, refreshSubscription, ISubscription };
