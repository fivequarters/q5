const superagent = require('superagent');

const removeLeadingSlash = (s) => s.replace(/^\/(.+)$/, '$1');
const removeTrailingSlash = (s) => s.replace(/^(.+)\/$/, '$1');

const createStorageClient = (ctx, storageIdPrefix) => {
  storageIdPrefix = storageIdPrefix ? removeLeadingSlash(removeTrailingSlash(storageIdPrefix)) : '';
  const functionUrl = new URL(ctx.baseUrl);
  let storageBaseUrl = `${functionUrl.protocol}//${functionUrl.host}/v1/account/${ctx.accountId}/subscription/${
    ctx.subscriptionId
  }/storage${storageIdPrefix ? '/' + storageIdPrefix : ''}`;

  const getUrl = (storageSubId) => {
    storageSubId = storageSubId ? removeTrailingSlash(removeLeadingSlash(storageSubId)) : '';
    return `${storageBaseUrl}${storageSubId ? '/' + storageSubId : ''}`;
  };

  const storageClient = {
    accessToken: '',
    get: async function (storageSubId) {
      storageSubId = storageSubId ? removeTrailingSlash(removeLeadingSlash(storageSubId)) : '';
      if (!storageSubId && !storageIdPrefix) {
        return undefined;
      }

      console.log(`storage.get: ${getUrl(storageSubId)}, ${storageClient.accessToken}`);
      const response = await superagent
        .get(getUrl(storageSubId))
        .set('Authorization', `Bearer ${storageClient.accessToken}`)
        .ok((res) => res.status < 300 || res.status === 404);
      return response.status === 404 ? undefined : response.body.data;
    },
    put: async function (data, storageSubId) {
      storageSubId = storageSubId ? removeTrailingSlash(removeLeadingSlash(storageSubId)) : '';
      if (!storageSubId && !storageIdPrefix) {
        throw new Error(
          'Storage objects cannot be stored at the root of the hierarchy. Specify a storageSubId when calling the `put` method, or a storageIdPrefix when creating the storage client.'
        );
      }
      console.log(`storage.put: ${getUrl(storageSubId)}, ${storageClient.accessToken}`);
      const response = await superagent
        .put(getUrl(storageSubId))
        .set('Authorization', `Bearer ${storageClient.accessToken}`)
        .send(data);
      return response.body;
    },
    delete: async function (storageSubId, recursive, forceRecursive) {
      storageSubId = storageSubId ? removeLeadingSlash(removeTrailingSlash(storageSubId)) : '';
      if (!storageSubId && !storageIdPrefix && recursive && !forceRecursive) {
        throw new Error(
          'You are attempting to recursively delete all storage objects in the Fusebit subscription. If this is your intent, please pass "true" as the third parameter in the call to delete(storageSubId, recursive, forceRecursive).'
        );
      }
      console.log(`storage.delete: ${getUrl(storageSubId)}, ${storageClient.accessToken}`);
      await superagent
        .delete(`${getUrl(storageSubId)}${recursive ? '/*' : ''}`)
        .set('Authorization', `Bearer ${storageClient.accessToken}`)
        .ok((res) => res.status === 404 || res.status === 204);
      return;
    },
    list: async function (storageSubId, { count, next } = {}) {
      console.log(`storage.list: ${getUrl(storageSubId)}, ${storageClient.accessToken}`);
      const response = await superagent
        .get(`${getUrl(storageSubId)}/*`)
        .query(isNaN(count) ? undefined : { count })
        .query(typeof next === 'string' ? { next } : undefined)
        .set('Authorization', `Bearer ${storageClient.accessToken}`);
      return response.body;
    },
  };

  return storageClient;
};

const storage = createStorageClient(
  {
    baseUrl: 'https://dev.us-west-1.dev.fusebit.io/v1/run/sub-0095d2ffa3d1424a/benn/oauth-connector',
    accountId: 'acc-7e0f8bbc30bc4c34',
    subscriptionId: 'sub-0095d2ffa3d1424a',
  },
  '/benn/oauth-connector'
);

exports.storage = storage;
