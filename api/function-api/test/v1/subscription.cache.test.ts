import { DynamoDB } from 'aws-sdk';
import { Defaults } from '@5qtrs/account';
import * as Constants from '@5qtrs/constants';

import { getSubscription, refreshSubscriptionCache } from './sdk';

import { getEnv } from './setup';

let { account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv();
beforeEach(() => {
  ({ account, boundaryId, function1Id, function2Id, function3Id, function4Id, function5Id } = getEnv());
});

const dynamo = new DynamoDB({ apiVersion: '2012-08-10' });
let oldDefaults: any;

beforeEach(async () => {
  oldDefaults = await Defaults.get(dynamo, Constants.DEFAULTS_SUBSCRIPTION);
  await Defaults.set(dynamo, Constants.DEFAULTS_SUBSCRIPTION, {});
});

afterEach(async () => {
  await Defaults.set(dynamo, Constants.DEFAULTS_SUBSCRIPTION, oldDefaults);
});

describe('Subscription', () => {
  test('Validate subscription cache contents', async () => {
    const sub = await getSubscription(account);
    expect(sub).toBeHttp({ statusCode: 200 });
    const cacheSub = await getSubscription(account, account.subscriptionId, 'cache');
    expect(cacheSub).toBeHttp({ statusCode: 200 });

    expect(cacheSub.data).toMatchObject(sub.data);
  }, 180000);

  test('Set defaults', async () => {
    await Defaults.set(dynamo, Constants.DEFAULTS_SUBSCRIPTION, { fruit: 'banana', and: { a: { value: 42 } } });
    await refreshSubscriptionCache(account);
    const cacheSub = await getSubscription(account, account.subscriptionId, 'cache');
    expect(cacheSub).toBeHttp({ statusCode: 200 });
    expect(cacheSub).toBeHttp({ statusCode: 200, data: { fruit: 'banana', and: { a: { value: 42 } } } });
  }, 180000);

  test('Several basic manipulations', async () => {
    await Defaults.set(dynamo, Constants.DEFAULTS_SUBSCRIPTION, { fruit: 'banana', and: { a: { value: 42 } } });
    await refreshSubscriptionCache(account);
    let cacheSub = await getSubscription(account, account.subscriptionId, 'cache');
    expect(cacheSub).toBeHttp({ statusCode: 200, data: { fruit: 'banana', and: { a: { value: 42 } } } });

    // Change the values
    await Defaults.set(dynamo, Constants.DEFAULTS_SUBSCRIPTION, { fruit: 'mango', and: { a: { value: 5 } } });
    await refreshSubscriptionCache(account);
    cacheSub = await getSubscription(account, account.subscriptionId, 'cache');
    expect(cacheSub).toBeHttp({ statusCode: 200, data: { fruit: 'mango', and: { a: { value: 5 } } } });
    expect(cacheSub.data.fruit).toBe('mango');
    expect(cacheSub.data.and).toEqual({ a: { value: 5 } });

    // Remove a values
    await Defaults.set(dynamo, Constants.DEFAULTS_SUBSCRIPTION, { fruit: 'mango', and: {} });
    await refreshSubscriptionCache(account);
    cacheSub = await getSubscription(account, account.subscriptionId, 'cache');
    console.log(cacheSub.data);
    expect(cacheSub).toBeHttp({ statusCode: 200, data: { fruit: 'mango', and: {} } });
  }, 180000);

  test('Set defaults are not in vanilla subscription endpoint', async () => {
    await Defaults.set(dynamo, Constants.DEFAULTS_SUBSCRIPTION, { fruit: 'banana' });
    const sub = await getSubscription(account);
    expect(sub).toBeHttp({ statusCode: 200 });
    expect(sub.data.fruit).not.toBe('banana');
  }, 180000);
});
