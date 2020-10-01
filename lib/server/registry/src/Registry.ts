interface IRegistryStore {
  put(key: string, pkg: any, payload: any): void;
  get(key: any): Promise<any>;
  tarball(key: any): Promise<Buffer | string>;
  search(keywords: string[]): Promise<any>;
}

export { IRegistryStore };
