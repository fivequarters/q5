import EntityBase from './EntityBase';
import { Context, Next } from '../Router';
import * as TenantService from '../Tenant';

class Middleware extends EntityBase.MiddlewareBase {
  loadConnector = (name: string) => async (ctx: Context, next: Next) => undefined; //TODO
}
class Service extends EntityBase.ServiceBase {
  getSdk = async (ctx: Context, connectorName: string, instanceId: string) =>
    ctx.state.manager.connectors.getByName(ctx, connectorName, instanceId);
  getSdks = (ctx: Context, connectorNames: string[], instanceId: string) =>
    ctx.state.manager.connectors.getByNames(ctx, connectorNames, instanceId);
}
class Tenant {
  getTenant: (ctx: Context, tenantId: string) => Promise<TenantService.IInstance> = async (
    ctx: Context,
    tenantId: string
  ) => TenantService.createRequest(ctx.state.params).getTenant(tenantId);
  deleteTenant: (ctx: Context, tenantId: string) => Promise<any> = async (ctx: Context, tenantId: string) =>
    TenantService.createRequest(ctx.state.params).deleteTenant(tenantId);
}

namespace Integration {
  export namespace Types {
    export type Context = EntityBase.Types.Context;
    export type Next = EntityBase.Types.Next;
    export interface IOnStartup extends EntityBase.Types.IOnStartup {}
  }
}
export default class Integration extends EntityBase {
  service = new Service();
  middleware = new Middleware();
  storage = new EntityBase.StorageDefault();
  tenant = new Tenant();
  response = new EntityBase.ResponseDefault();
}
