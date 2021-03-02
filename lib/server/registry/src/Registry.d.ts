/// <reference types="node" />
interface IRegistryConfig {
    url?: string;
    scopes: string[];
}
interface IRegistryInternalConfig extends IRegistryConfig {
    url?: string;
    scopes: string[];
    global: IRegistryGlobalConfig;
}
interface IRegistryGlobalConfig {
    scopes: string[];
    params: IRegistryParams;
}
interface IRegistryParams {
    accountId: string;
    registryId: string;
}
interface IRegistrySearchResults {
    objects: any[];
    total: number;
    time: string;
    next?: string;
}
interface IRegistryStore {
    name(): string;
    put(key: string, pkg: any, ver?: string, payload?: any): Promise<void>;
    get(key: string): Promise<any>;
    delete(key: string): Promise<any>;
    semverGet(key: string, filter: string): Promise<string | null>;
    tarballGet(nameVer: string): Promise<Buffer | string>;
    tarballDelete(nameVer: string): Promise<any>;
    search(keyword: string, count: number, next: string | undefined): Promise<any>;
    configPut(config: IRegistryConfig): Promise<void>;
    configGet(): Promise<IRegistryConfig>;
    configDelete(): Promise<void>;
}
interface IRegistryEventHandlers {
    onNewPackage?(name: string, version: string, registry: string): Promise<void>;
    onNewPackage?(): Promise<void>;
    onDeletePackage?(name: string, version: string, registry: string): Promise<void>;
    onDeletePackage?(): Promise<void>;
}
declare class InvalidScopeException extends Error {
}
export { IRegistryConfig, IRegistryInternalConfig, IRegistryGlobalConfig, IRegistryParams, IRegistrySearchResults, IRegistryStore, IRegistryEventHandlers, InvalidScopeException, };
//# sourceMappingURL=Registry.d.ts.map