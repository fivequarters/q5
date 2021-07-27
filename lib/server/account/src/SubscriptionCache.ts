import { DynamoDB } from 'aws-sdk';

import * as Defaults from './Defaults';
import * as Constants from '@5qtrs/constants';

// Don't refresh more often than once every 10 seconds.
const MAX_CACHE_REFRESH_RATE = 10 * 1000;

export interface ISubscription {
  id: string;
  accountId: string;
  subscriptionId: never;
  displayName: string;

  // Defaults and overrides
  registry?: {
    scopes: string[];
    params: {
      accountId: string;
      registryId: string;
    };
  };
  [key: string]: any;
}

interface ISubscriptionCache {
  [subscriptionId: string]: ISubscription;
}

export default class SubscriptionCache {
  protected cache: ISubscriptionCache = {};
  protected defaults: any = {};
  protected allowRefreshAfter: number;
  protected dynamo: DynamoDB;

  constructor(options: { dynamo?: DynamoDB }) {
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
  }

  public add = (entry: ISubscription) => {
    if (this.cache[entry.id] && this.cache[entry.id].accountId !== entry.accountId) {
      console.log(
        `ERROR: Duplicate subscription found for ${this.cache[entry.id].accountId} and ${entry.accountId}: ${entry.id}`
      );
    }
    this.cache[entry.id] = entry;
  };

  public compose(subscription?: ISubscription): ISubscription | undefined {
    return subscription ? Constants.mergeDeep(this.defaults, subscription) : undefined;
  }

  public async find(key: string): Promise<ISubscription | undefined> {
    const result = this.cache[key];
    if (result) {
      return this.compose(result);
    }

    await this.refresh();

    // May still fail if the entry isn't found in the cache.
    return this.compose(this.cache[key]);
  }

  public async get(accountId: string, subscriptionId: string): Promise<ISubscription | undefined> {
    let result: ISubscription | undefined = this.cache[subscriptionId];
    if (result) {
      return this.compose(result);
    }

    // Not found in the cache, attempt DynamoDB directly.

    const entry = await this.dynamo
      .getItem({
        TableName: Constants.get_subscription_table_name(process.env.DEPLOYMENT_KEY as string),
        Key: { accountId: { S: accountId }, subscriptionId: { S: subscriptionId } },
      })
      .promise();

    result = this.awsToSubscription(entry.Item);

    this.add(result);

    return this.compose(result);
  }

  protected awsToSubscription(entry: any): ISubscription {
    const result: { [name: string]: any } = {};
    Object.entries(entry).forEach((e) => {
      // This is silly looking because it's unrolling the { accountId: { S: 'acc-1234' } } DynamoDB typing.
      result[e[0]] = Object.values(entry[e[0]])[0];
    });

    result.id = result.subscriptionId;
    delete result.subscriptionId;

    // Deserialize some known json fields, if present
    result.limits = JSON.parse(result.limits || '{}');
    result.flags = JSON.parse(result.flags || '{}');

    return result as ISubscription;
  }

  public async refresh(): Promise<number> {
    if (this.allowRefreshAfter > Date.now()) {
      return this.allowRefreshAfter;
    }

    try {
      // If the cache is already populated, bump the allowRefreshAfter to prevent multiple outstanding
      // refreshes while DynamoDB is processing.
      if (this.healthCheck()) {
        this.allowRefreshAfter = Date.now() + MAX_CACHE_REFRESH_RATE;
      }
    } catch (error) {
      // No subscriptions loaded; don't bump refresh rate.
    }

    const params = {
      TableName: Constants.get_subscription_table_name(process.env.DEPLOYMENT_KEY as string),
    };

    const results = await Constants.dynamoScanTable(this.dynamo, params, (entry: any) => {
      return this.awsToSubscription(entry);
    });

    // Don't throw away the cache if the dynamo lookup returned no items.
    if (!results.length) {
      return this.allowRefreshAfter;
    }

    // Clear the cache
    this.cache = {};

    // Populate it with the new items found
    results.forEach((entry: any) => {
      this.add(entry);
    });

    await this.refreshDefaults();

    console.log(`CACHE: Subscription cache refreshed: ${results.length} subscriptions loaded`);

    return this.allowRefreshAfter;
  }

  public async refreshDefaults() {
    try {
      this.defaults = await Defaults.get(this.dynamo, Constants.DEFAULTS_SUBSCRIPTION);

      console.log(`CACHE: Subscription defaults refreshed: ${JSON.stringify(this.defaults)}`);
    } catch (e) {
      console.log(`CACHE: Subscription defaults not loaded: ${e}`);
    }
  }

  // Fastest way to see if a javascript dictionary has any members.
  public healthCheck() {
    for (const i in this.cache) {
      return true;
    }
    throw new Error('subscription cache not loaded');
  }
}
