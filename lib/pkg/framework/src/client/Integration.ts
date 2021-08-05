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
class Tenant extends EntityBase.TenantDefault {
  listTenants: (ctx: Context, tags: string) => Promise<any> = async (ctx: Context, tags: string) =>
    TenantService.createRequest(ctx.state.params).get(tags);
  listInstanceTenants: (ctx: Context, instanceId: string) => Promise<any> = async (ctx: Context, instanceId: string) =>
    TenantService.createRequest(ctx.state.params).getInstanceTenants(instanceId);
  listTenantInstances: (ctx: Context, tenantId: string) => Promise<any> = async (ctx: Context, tenantId: string) =>
    TenantService.createRequest(ctx.state.params).getTenantInstances(tenantId);
  deleteTenant: (ctx: Context, tenantId: string) => Promise<any> = async (ctx: Context, tenantId: string) =>
    TenantService.createRequest(ctx.state.params).delete(tenantId);
}
export default class Integration extends EntityBase {
  service = new Service();
  middleware = new Middleware();
  storage = new EntityBase.StorageDefault();
  tenant = new Tenant();
  response = new EntityBase.ResponseDefault();
}