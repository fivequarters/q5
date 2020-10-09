interface IRegistryConfig {
  url?: string;
  scopes: string[];
}

interface IRegistryParams {
  accountId: string;
  subscriptionId?: string;
  registryId: string;
}

interface IRegistryStore {
  put(key: string, pkg: any, payload: any): Promise<void>;
  get(key: string): Promise<any>;
  semverGet(key: string, filter: string): Promise<string | null>;
  tarball(key: string): Promise<Buffer | string>;
  search(keyword: string, count: number, next: string | undefined): Promise<any>;
  configPut(config: IRegistryConfig): Promise<void>;
  configGet(): Promise<IRegistryConfig>;
}

export { IRegistryConfig, IRegistryParams, IRegistryStore };
