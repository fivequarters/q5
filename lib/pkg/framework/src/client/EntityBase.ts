import { Context, Next, Router } from '../Router';
import * as Storage from '../Storage';
import * as Tenant from '../Tenant';

abstract class EntityBase {
  abstract service: EntityBase.ServiceBase;
  abstract tenant: EntityBase.TenantBase;
  abstract storage: EntityBase.StorageBase;
  abstract middleware: EntityBase.MiddlewareBase;
  abstract response: EntityBase.ResponseBase;

  protected _router: Router = new Router();
  public readonly router = function getRouter() {
    // @ts-ignore
    return this._router;
  }.call(this);
}

namespace EntityBase {
  export abstract class ServiceBase {
    getSdk?: (ctx: Context, connectorName: string, tenantId: string) => unknown;
    getSdks?: (ctx: Context, connectorName: string[], tenantId: string) => unknown;
  }
  export abstract class TenantBase {
    listTenants: (ctx: Context, tags: string) => Promise<any> = async (ctx: Context, tags: string) =>
      Tenant.createRequest(ctx.state.params).get(tags);
    listInstanceTenants: (ctx: Context, instanceId: string) => Promise<any> = async (
      ctx: Context,
      instanceId: string
    ) => Tenant.createRequest(ctx.state.params).getInstanceTenants(instanceId);
    listTenantInstances: (ctx: Context, tenantId: string) => Promise<any> = async (ctx: Context, tenantId: string) =>
      Tenant.createRequest(ctx.state.params).getTenantInstances(tenantId);
    deleteTenant: (ctx: Context, tenantId: string) => Promise<any> = async (ctx: Context, tenantId: string) =>
      Tenant.createRequest(ctx.state.params).delete(tenantId);
  }
  export abstract class StorageBase {
    setData: (ctx: Context, dataKey: string, data: any) => Promise<any> = async (
      ctx: Context,
      dataKey: string,
      data: any
    ) => Storage.createStorage(ctx.state.params).put(data, dataKey);
    getData: (ctx: Context, dataKey: string) => Promise<any> = async (ctx: Context, dataKey: string) =>
      Storage.createStorage(ctx.state.params).get(dataKey);
    listData: (ctx: Context, dataKeyPrefix: string, options?: Storage.IListOption) => Promise<any> = async (
      ctx: Context,
      dataKeyPrefix: string,
      options?: Storage.IListOption
    ) => Storage.createStorage(ctx.state.params).list(dataKeyPrefix, options);
    deleteData: (ctx: Context, dataKey: string) => Promise<any> = async (ctx: Context, dataKey: string) =>
      Storage.createStorage(ctx.state.params).delete(dataKey);
    deletePrefixedData: (ctx: Context, dataKeyPrefix?: string) => Promise<any> = (
      ctx: Context,
      dataKeyPrefix?: string
    ) => Storage.createStorage(ctx.state.params).delete(dataKeyPrefix, true, true);
  }
  export abstract class MiddlewareBase {
    authorizeUser: (Permissions: string | string[]) => (ctx: Context, next: Next) => undefined = (
      Permissions: string | string[]
    ) => {
      return (ctx: Context, next: Next) => {
        return undefined; //Todo
      };
    };
    loadTenant: (tags: string) => (ctx: Context, next: Next) => Promise<any> = (tags: string) => {
      return async (ctx: Context, next: Next) => {
        return undefined; //Todo
      };
    };
    loadConnector?: (name: string) => (ctx: Context, next: Next) => Promise<any>;
  }
  export abstract class ResponseBase {
    createJsonForm: undefined; //TODO
    createError: undefined; //TODO
  }

  export class TenantDefault extends TenantBase {}
  export class ServiceDefault extends ServiceBase {}
  export class StorageDefault extends StorageBase {}
  export class MiddlewareDefault extends MiddlewareBase {}
  export class ResponseDefault extends ResponseBase {}
}
export default EntityBase;
