interface IRegistryConfig {
  url?: string;
  scopes: string[];
}

interface IRegistryStore {
  put(key: string, pkg: any, payload: any): Promise<void>;
  get(key: string): Promise<any>;
  tarball(key: string): Promise<Buffer | string>;
  search(keyword: string, count: number, next: string | undefined): Promise<any>;
  configPut(config: IRegistryConfig): Promise<void>;
  configGet(): Promise<IRegistryConfig>;
}

export { IRegistryConfig, IRegistryStore };
