import superagent from 'superagent';

const removeLeadingSlash = (s: string) => s.replace(/^\/(.+)$/, '$1');
const removeTrailingSlash = (s: string) => s.replace(/^(.+)\/$/, '$1');

const createStorage = (params: any, storageIdPrefix: string) => {
  storageIdPrefix = storageIdPrefix ? removeLeadingSlash(removeTrailingSlash(storageIdPrefix)) : '';
  const functionUrl = new URL(params.baseUrl);
  const storageBaseUrl = `${functionUrl.protocol}//${functionUrl.host}/v1/account/${params.accountId}/subscription/${
    params.subscriptionId
  }/storage${storageIdPrefix ? '/' + storageIdPrefix : ''}`;

  const getUrl = (storageSubId: string) => {
    storageSubId = storageSubId ? removeTrailingSlash(removeLeadingSlash(storageSubId)) : '';
    return `${storageBaseUrl}${storageSubId ? '/' + storageSubId : ''}`;
  };

  const storageClient = {
    accessToken: params.accessToken,
    get: async (storageSubId?: string) => {
      storageSubId = storageSubId ? removeTrailingSlash(removeLeadingSlash(storageSubId)) : '';
      if (!storageSubId && !storageIdPrefix) {
        return undefined;
      }

      const response = await superagent
        .get(getUrl(storageSubId))
        .set('Authorization', `Bearer ${storageClient.accessToken}`)
        .ok((res) => res.status < 300 || res.status === 404);
      return response.status === 404 ? undefined : response.body.data;
    },
    put: async (data: any, storageSubId?: string) => {
      storageSubId = storageSubId ? removeTrailingSlash(removeLeadingSlash(storageSubId)) : '';
      if (!storageSubId && !storageIdPrefix) {
        throw new Error(
          'Storage objects cannot be stored at the root of the hierarchy. Specify a storageSubId when calling the `put` method, or a storageIdPrefix when creating the storage client.'
        );
      }
      const response = await superagent
        .put(getUrl(storageSubId))
        .set('Authorization', `Bearer ${storageClient.accessToken}`)
        .send(data);
      return response.body;
    },
    delete: async (storageSubId?: string, recursive?: boolean, forceRecursive?: boolean) => {
      storageSubId = storageSubId ? removeLeadingSlash(removeTrailingSlash(storageSubId)) : '';
      if (!storageSubId && !storageIdPrefix && recursive && !forceRecursive) {
        throw new Error(
          'You are attempting to recursively delete all storage objects in the Fusebit subscription. If this is your intent, please pass "true" as the third parameter in the call to delete(storageSubId, recursive, forceRecursive).'
        );
      }
      await superagent
        .delete(`${getUrl(storageSubId)}${recursive ? '/*' : ''}`)
        .set('Authorization', `Bearer ${storageClient.accessToken}`)
        .ok((res) => res.status === 404 || res.status === 204);
      return;
    },
    list: async (storageSubId: string, { count, next }: { count?: number; next?: string } = {}) => {
      const response = await superagent
        .get(`${getUrl(storageSubId)}/*`)
        .query(count && isNaN(count) ? {} : { count: 5 })
        .query(typeof next === 'string' ? { next } : {})
        .set('Authorization', `Bearer ${storageClient.accessToken}`);
      return response.body;
    },
  };

  return storageClient;
};

export { createStorage };
