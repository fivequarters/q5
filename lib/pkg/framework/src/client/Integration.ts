import superagent from 'superagent';
import EntityBase from './EntityBase';
import { Context, Next } from '../Router';

const TENANT_TAG_NAME = 'tenant';

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
  getTenant = async (ctx: Context, tenantId: string): Promise<EntityBase.Types.IInstance> =>
    (
      await superagent
        .get(`${ctx.state.baseUrl}/instance?tag=${TENANT_TAG_NAME}=${tenantId}`)
        .set('Authorization', `Bearer ${ctx.params.accessToken}`)
        .ok((res) => res.status < 300)
    ).body?.data[0];

  deleteTenant = async (ctx: Context, tenantId: string) => {
    const tenantInstance = await this.getTenant(ctx, tenantId);
    return (
      await superagent
        .delete(`${ctx.state.baseUrl}/instance/${tenantInstance.id}`)
        .set('Authorization', `Bearer ${ctx.state.params.accessToken}`)
        .ok((res) => res.status < 300)
    ).body?.data;
  };
}

namespace Integration {
  export namespace Types {
    export type Context = EntityBase.Types.Context;
    export type Next = EntityBase.Types.Next;
    export interface IOnStartup extends EntityBase.Types.IOnStartup {}
    export interface IInstance extends EntityBase.Types.IInstance {}
  }
}
export default class Integration extends EntityBase {
  service = new Service();
  middleware = new Middleware();
  storage = new EntityBase.StorageDefault();
  tenant = new Tenant();
  response = new EntityBase.ResponseDefault();
}
