// Utility Types
import { Context, Router } from '../Router';
import * as Storage from '../Storage';
import * as Tenant from '../Tenant';

type ISdkArgument<T extends SDKNamespaces> = Omit<INamespaces[T], keyof typeof NamespaceDefaultValues[T]> &
  Partial<typeof NamespaceDefaultValues[T]>;
export type NamespaceArguments = {
  [key in SDKNamespaces]: ISdkArgument<key>;
};
export type SdkClass = {
  [key in SDKNamespaces]: INamespaces[key];
};
type SdkBaseClassAttributes = {
  [key in SDKNamespaces]: typeof NamespaceDefaultValues[key];
};

// ENUM
enum SDKNamespaces {
  middleware = 'middleware',
  service = 'service',
  storage = 'storage',
  response = 'response',
}
// Namespace Service Interfaces
type INamespaces = {
  [SDKNamespaces.service]: {
    getSdk: Function;
    getSdks: Function;
  };
  [SDKNamespaces.storage]: {
    setData: (ctx: Context, dataKey: string, data: any) => Promise<any>;
    getData: (ctx: Context, dataKey: string) => Promise<any>;
    listData: (ctx: Context, dataKeyPrefix: string, options?: Storage.IListOption) => Promise<any>;
    deleteData: (ctx: Context, dataKey: string) => Promise<any>;
    deletePrefixedData: (ctx: Context, dataKeyPrefix?: string) => Promise<any>;
    listTenants: (ctx: Context, tags: string) => Promise<any>;
    listInstanceTenants: (ctx: Context, instanceId: string) => Promise<any>;
    listTenantInstances: (ctx: Context, tenantId: string) => Promise<any>;
    deleteTenant: (ctx: Context, tenantId: string) => Promise<any>;
  };
  [SDKNamespaces.middleware]: {
    authorizeUser: undefined; //(Permissions: string | string[]) => (ctx: Context, next: () => {}) => undefined; //TODO
    loadConnector: undefined; //TODO
    loadTenant: undefined; //TODO
  };
  [SDKNamespaces.response]: {
    createJsonForm: undefined; //TODO
    createError: undefined; //TODO
  };
};
// Namespace Default Values
const NamespaceDefaultValues = {
  [SDKNamespaces.service]: {},
  [SDKNamespaces.storage]: {
    setData: async (ctx: Context, dataKey: string, data: any) =>
      Storage.createStorage(ctx.state.params).put(data, dataKey),
    getData: async (ctx: Context, dataKey: string) => Storage.createStorage(ctx.state.params).get(dataKey),
    listData: async (ctx: Context, dataKeyPrefix: string, options?: Storage.IListOption) =>
      Storage.createStorage(ctx.state.params).list(dataKeyPrefix, options),
    deleteData: (ctx: Context, dataKey: string) => Storage.createStorage(ctx.state.params).delete(dataKey),
    deletePrefixedData: (ctx: Context, dataKeyPrefix?: string) =>
      Storage.createStorage(ctx.state.params).delete(dataKeyPrefix, true, true),
    listTenants: async (ctx: Context, tags: string) => Tenant.createRequest(ctx.state.params).get(tags),
    listInstanceTenants: async (ctx: Context, instanceId: string) =>
      Tenant.createRequest(ctx.state.params).getInstanceTenants(instanceId),
    listTenantInstances: async (ctx: Context, tenantId: string) =>
      Tenant.createRequest(ctx.state.params).getTenantInstances(tenantId),
    deleteTenant: async (ctx: Context, tenantId: string) => Tenant.createRequest(ctx.state.params).delete(tenantId),
  },
  [SDKNamespaces.middleware]: {
    authorizeUser: undefined, //(Permissions: string | string[]) => (ctx: Context, next: () => {}) => undefined; //TODO
    loadTenant: undefined, //TODO
  },
  [SDKNamespaces.response]: {},
};

abstract class SdkBaseClass implements SdkBaseClassAttributes {
  protected constructor(namespaceArguments: NamespaceArguments) {
    this[SDKNamespaces.middleware] = {
      ...NamespaceDefaultValues[SDKNamespaces.middleware],
      ...namespaceArguments[SDKNamespaces.middleware],
    };
    this[SDKNamespaces.storage] = {
      ...NamespaceDefaultValues[SDKNamespaces.storage],
      ...namespaceArguments[SDKNamespaces.storage],
    };
    this[SDKNamespaces.service] = {
      ...NamespaceDefaultValues[SDKNamespaces.service],
      ...namespaceArguments[SDKNamespaces.service],
    };
    this[SDKNamespaces.response] = {
      ...NamespaceDefaultValues[SDKNamespaces.response],
      ...namespaceArguments[SDKNamespaces.response],
    };
    this.router = new Router();
  }

  public readonly router: Router;

  public readonly [SDKNamespaces.service]: INamespaces[SDKNamespaces.service];
  public readonly [SDKNamespaces.storage]: INamespaces[SDKNamespaces.storage];
  public readonly [SDKNamespaces.middleware]: INamespaces[SDKNamespaces.middleware];
  public readonly [SDKNamespaces.response]: INamespaces[SDKNamespaces.response];
}

export default SdkBaseClass;
