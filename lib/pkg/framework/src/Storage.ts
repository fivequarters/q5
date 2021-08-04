import superagent from 'superagent';

const removeLeadingSlash = (s: string) => s.replace(/^\/(.+)$/, '$1');
const removeTrailingSlash = (s: string) => s.replace(/^(.+)\/$/, '$1');

export interface IStorageResponse {}

export interface IStorageClient {
  accessToken: string;
  get: (storageSubId?: string) => Promise<string | undefined>;
  put: (data: any, storageSubId?: string) => Promise<Response>;
  delete: (storageSubId?: string, recursive?: boolean, forceRecursive?: boolean) => Promise<void>;
  list: (storageSubId: string, { count, next }?: IListOption) => Promise<IStorageResponse>;
}
export interface IListOption {
  count?: number;
  next?: string;
}

export interface IStorageParam {
  baseUrl: string;
  accountId: string;
  subscriptionId: string;
  accessToken: string;
  storageIdPrefix?: string;
}

export const createStorage = (params: IStorageParam): IStorageClient => {
  const storageIdPrefix = params.storageIdPrefix ? removeLeadingSlash(removeTrailingSlash(params.storageIdPrefix)) : '';
  const functionUrl = new URL(params.baseUrl);
  const storageBaseUrl = `${functionUrl.protocol}//${functionUrl.host}/v1/account/${params.accountId}/subscription/${
    params.subscriptionId
  }/storage${storageIdPrefix ? '/' + storageIdPrefix : ''}`;

  const getUrl = (storageSubId: string) => {
    storageSubId = storageSubId ? removeTrailingSlash(removeLeadingSlash(storageSubId)) : '';
    return `${storageBaseUrl}${storageSubId ? '/' + storageSubId : ''}`;
  };

  const storageClient: IStorageClient = {
    accessToken: params.accessToken,
    get: async (storageSubId?: string, storageId?: string) => {
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
      const response = await superagent
        .delete(`${getUrl(storageSubId)}${recursive ? '/*' : ''}`)
        .set('Authorization', `Bearer ${storageClient.accessToken}`)
        .ok((res) => res.status === 404 || res.status === 204);
      return response.body;
    },
    list: async (storageSubId: string, { count, next }: IListOption = {}) => {
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
