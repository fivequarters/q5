import { AwsKeyStore } from '@5qtrs/runas';
import { SubscriptionCache } from '@5qtrs/account';

// Create the keystore and guarantee an initial key
export const keyStore = new AwsKeyStore({});
keyStore.rekey();

// Create and load a cache with the current subscription->account mapping
export const subscriptionCache = new SubscriptionCache({});
subscriptionCache.refresh();
