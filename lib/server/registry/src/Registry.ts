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
}

interface IRegistryEvents {
  onNewPackage?(name: string, version: string, registry: string): Promise<void>;
}

class InvalidScopeException extends Error {}

export {
  IRegistryConfig,
  IRegistryInternalConfig,
  IRegistryGlobalConfig,
  IRegistryParams,
  IRegistrySearchResults,
  IRegistryStore,
  IRegistryEvents,
  InvalidScopeException,
};
