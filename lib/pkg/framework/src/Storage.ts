import superagent from 'superagent';

const removeLeadingSlash = (s: string) => s.replace(/^\/(.+)$/, '$1');
const removeTrailingSlash = (s: string) => s.replace(/^(.+)\/$/, '$1');

export interface IStorageResponse {
  data: any;
  etag: string;
  tags: Record<string, string>;
}

export interface IStorageVersionedResponse {
  data: any;
  version: string;
  tags: Record<string, string>;
}

export interface IStorageVersionedResponseList {
  items: IStorageVersionedResponse[];
  total: number;
}

export interface IStorageClient {
  accessToken: string;
  get: (storageSubId?: string) => Promise<IStorageVersionedResponse | undefined>;
  put: (data: any, storageSubId?: string, version?: string) => Promise<IStorageVersionedResponse>;
  deletePrefixed: (storageSubId: string, version?: string) => Promise<IStorageVersionedResponse>;
  deleteAll: (forceRecursive: boolean) => Promise<IStorageVersionedResponseList>;
  delete: (storageSubId: string, version?: string) => Promise<IStorageVersionedResponse>;
  list: (storageSubId: string, options?: IListOption) => Promise<IStorageVersionedResponseList>;
}
export interface IListOption {
  count?: number;
  next?: string;
}

export interface IStorageParam {
  baseUrl: string;
  accountId: string;
  subscriptionId: string;
  functionAccessToken: string;
  storageIdPrefix?: string;
}

export const createStorage = (params: IStorageParam): IStorageClient => {
  const storageIdPrefix = params.storageIdPrefix ? removeLeadingSlash(removeTrailingSlash(params.storageIdPrefix)) : '';
  const functionUrl = new URL(params.baseUrl);
  const storageBaseUrl = `${functionUrl.protocol}//${functionUrl.host}/v1/account/${params.accountId}/subscription/${
    params.subscriptionId
  }/storage${storageIdPrefix ? '/' + storageIdPrefix : ''}`;

  const convertToVersion = (response: IStorageResponse) => {
    const versionResponse: IStorageVersionedResponse = {
      data: response.data,
      tags: response.tags,
      version: response.etag,
    };
    return versionResponse;
  };

  const getUrl = (storageSubId: string) => {
    storageSubId = storageSubId ? removeTrailingSlash(removeLeadingSlash(storageSubId)) : '';
    return `${storageBaseUrl}${storageSubId ? '/' + storageSubId : ''}`;
  };

  const storageClient: IStorageClient = {
    accessToken: params.functionAccessToken,
    get: async (storageSubId?: string) => {
      storageSubId = storageSubId ? removeTrailingSlash(removeLeadingSlash(storageSubId)) : '';
      if (!storageSubId && !storageIdPrefix) {
        return undefined;
      }

      const response = await superagent
        .get(getUrl(storageSubId))
        .set('Authorization', `Bearer ${storageClient.accessToken}`)
        .ok((res) => res.status < 300 || res.status === 404);
      return response.status === 404 ? undefined : convertToVersion(response.body);
    },
    put: async (data: any, storageSubId?: string, version?: string) => {
      storageSubId = storageSubId ? removeTrailingSlash(removeLeadingSlash(storageSubId)) : '';
      if (!storageSubId && !storageIdPrefix) {
        throw new Error(
          'Storage objects cannot be stored at the root of the hierarchy. Specify a storageSubId when calling the `put` method, or a storageIdPrefix when creating the storage client.'
        );
      }
      const request = superagent.put(getUrl(storageSubId)).set('Authorization', `Bearer ${storageClient.accessToken}`);
      if (version) {
        request.set('If-Match', version);
      }
      const response = await request.send({ data, etag: version });
      return convertToVersion(response.body);
    },
    deleteAll: async (forceRecursive?: boolean) => {
      if (!forceRecursive) {
        throw new Error(
          'You are attempting to recursively delete all storage objects in the Fusebit subscription. If this is your intent, please pass "true" as the argument in the call to deleteAll(forceRecursive).'
        );
      }
      const response = await superagent
        .delete(`${getUrl('')}/*`)
        .set('Authorization', `Bearer ${storageClient.accessToken}`)
        .ok((res) => res.status === 404 || res.status === 204);
      response.body.items = response.body.items.map(convertToVersion);
      return response.body;
    },
    delete: async (storageSubId: string, version?: string) => {
      storageSubId = storageSubId ? removeLeadingSlash(removeTrailingSlash(storageSubId)) : '';
      const request = superagent
        .delete(`${getUrl(storageSubId)}`)
        .set('Authorization', `Bearer ${storageClient.accessToken}`);
      if (version) {
        request.set('If-Match', version);
      }
      const response = await request.ok((res) => res.status === 404 || res.status === 204);
      return convertToVersion(response.body);
    },
    deletePrefixed: async (storageSubId: string, version?: string) => {
      storageSubId = storageSubId ? removeLeadingSlash(removeTrailingSlash(storageSubId)) : '';
      const request = superagent
        .delete(`${getUrl(storageSubId)}/*`)
        .set('Authorization', `Bearer ${storageClient.accessToken}`);
      if (version) {
        request.set('If-Match', version);
      }
      const response = await request.ok((res) => res.status === 404 || res.status === 204);
      response.body.items = response.body.items.map(convertToVersion);
      return response.body;
    },
    list: async (storageSubId: string, { count, next }: IListOption = {}) => {
      const response = await superagent
        .get(`${getUrl(storageSubId)}/*`)
        .query(count && !isNaN(count) ? { count } : { count: 5 })
        .query(typeof next === 'string' ? { next } : {})
        .set('Authorization', `Bearer ${storageClient.accessToken}`);
      response.body.items = response.body.items.map(convertToVersion);
      return response.body;
    },
  };

  return storageClient;
};
