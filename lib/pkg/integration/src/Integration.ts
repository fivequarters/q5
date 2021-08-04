import { Router, Storage, Context, IListOption, Tenant } from '@fusebit-int/framework';

class Integration {
  constructor() {
    this.router = new Router();
  }

  public readonly router: Router;

  readonly storage = {
    setData: async (ctx: Context, dataKey: string, data: any) =>
      Storage.createStorage(ctx.state.params).put(data, dataKey),
    getData: async (ctx: Context, dataKey: string) => Storage.createStorage(ctx.state.params).get(dataKey),
    listData: async (ctx: Context, dataKeyPrefix: string, options?: IListOption) =>
      Storage.createStorage(ctx.state.params).list(dataKeyPrefix, options),
    deleteData: (ctx: Context, dataKey?: string) => Storage.createStorage(ctx.state.params).delete(dataKey),
    deleteDataWithPrefix: (ctx: Context, dataKeyPrefix?: string) =>
      Storage.createStorage(ctx.state.params).delete(dataKeyPrefix, true, true),
    listTenants: async (ctx: Context, tags?: string | string[]) => Tenant.createRequest(ctx.state.params).get(tags),
    listInstanceTenants: async (ctx: Context, instanceId: string) =>
      Tenant.createRequest(ctx.state.params).getInstanceTenants(instanceId),
    listTenantInstances: async (ctx: Context, tenantId: string) =>
      Tenant.createRequest(ctx.state.params).getTenantInstances(tenantId),
    deleteTenant: async (ctx: Context, tenantId: string) => Tenant.createRequest(ctx.state.params).delete(tenantId),
  };

  readonly middleware = {
    authorizeUser: (Permissions: string | string[]) => (ctx: Context, next: () => {}) => undefined, //TODO
    loadConnector: undefined, //TODO
    loadTenant: undefined, //TODO
  };

  readonly service = {
    getSDK: async (ctx: Context, connectorName: string) =>
      ctx.state.manager.connectors.getByName(connectorName, (ctx: Context) => ctx.params.tenantId)(ctx),
    getSDKs: (ctx: Context, connectorNames: string[]) =>
      ctx.state.manager.connectors.getByNames(connectorNames, (ctx: Context) => ctx.params.tenantIc)(ctx),
  };

  readonly response = {
    createJsonForm: undefined, //TODO
    createError: undefined, //TODO
  };
}
export default Integration;
