import { Router, Storage, IStorageClient, Context, IListOption } from '@fusebit-int/framework';
import { accountId, subscriptionId } from '@5qtrs/function-api/libc/routes/validation/common';

enum HTTPMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DELETE = 'delete',
}

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
    listTenants: async (ctx: Context, tenantPrefix?: string) =>
      Storage.createStorage(ctx.state.params).get(`tenant/${tenantPrefix}*`),
    listInstanceTenants: async (instanceId: string) => undefined, //TODO
    listTenantInstances: async (tenantId: string) => undefined, //TODO
    deleteTenant: async (tenant: string) => undefined, //TODO
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
