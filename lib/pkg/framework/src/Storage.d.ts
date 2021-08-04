export interface IStorageResponse {
}
export interface IStorageClient {
    accessToken: string;
    get: (storageSubId?: string) => Promise<string | undefined>;
    put: (data: any, storageSubId?: string) => Promise<IStorageResponse>;
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
export declare const createStorage: (params: IStorageParam) => IStorageClient;
//# sourceMappingURL=Storage.d.ts.map