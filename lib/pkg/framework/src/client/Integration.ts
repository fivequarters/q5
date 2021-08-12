import EntityBase from './EntityBase';
import { Context, Next } from '../Router';
import superagent from 'superagent';

const TENANT_TAG_NAME = 'tenantId';

class Middleware extends EntityBase.MiddlewareBase {
  loadConnector = (name: string) => async (ctx: Context, next: Next) => undefined; //TODO
}
class Service extends EntityBase.ServiceBase {
  getSdk = async (ctx: Context, connectorName: string, tenantId: string) => {
    const instance = await this.getInstance(ctx, tenantId);
    const identityId = instance.items[0].data[connectorName]?.entityId;
    return ctx.state.manager.connectors.getByName(ctx, connectorName, identityId);
  };

  getSdks = (ctx: Context, connectorNames: string[], tenantId: string) => {
    return connectorNames.map((connectorName) => this.getSdk(ctx, connectorName, tenantId));
  };
  getInstance = async (ctx: Context, tenantId: string): Promise<EntityBase.Types.IInstanceResponse> => {
    const params = ctx.state.params;
    const response = await superagent
      .get(`${ctx.state.params.baseUrl}/instance?tag=${TENANT_TAG_NAME}=${tenantId}`)
      .set('Authorization', `Bearer ${params.functionAccessToken}`);
    const body = response.body;
    return body;
  };
}
class Tenant {}

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
