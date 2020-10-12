interface IRegistryConfig {
  url?: string; // Only present when returned to the caller, populated by function-api
  scopes: string[];
}

interface IRegistryInternalConfig extends IRegistryConfig {
  url?: string;
  scopes: string[];
  global: IRegistryGlobalConfig;
}

// Updated via fuse-ops, as global changes will be very rare; touching all of the registry configs to change
// will be cheaper than requiring a double-lookup on every operation.
interface IRegistryGlobalConfig {
  scopes: string[]; // Validate the params are set before allowing scopes to be changed.
  params: IRegistryParams;
}

// Also hung in 'default' in DynamoDB - points to the location of the global registry
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
  put(key: string, pkg: any, payload: any): Promise<void>;
  get(key: string): Promise<any>;
  semverGet(key: string, filter: string): Promise<string | null>;
  tarball(key: string): Promise<Buffer | string>;
  search(keyword: string, count: number, next: string | undefined): Promise<any>;
  configPut(config: IRegistryConfig): Promise<void>;
  configGet(): Promise<IRegistryConfig>;
}

class InvalidScopeException extends Error {}

export {
  IRegistryConfig,
  IRegistryInternalConfig,
  IRegistryGlobalConfig,
  IRegistryParams,
  IRegistrySearchResults,
  IRegistryStore,
  InvalidScopeException,
};
