interface IRegistryStore {
  put(key: string, pkg: any, payload: any): void;
  get(key: any): Promise<any>;
  tarball(key: any): Promise<Buffer | string>;
  search(keyword: string, count: number, next: string | undefined): Promise<any>;
}

export { IRegistryStore };
