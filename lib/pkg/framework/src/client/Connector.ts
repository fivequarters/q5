import EntityBase from './EntityBase';

class Connector extends EntityBase {
  service = new EntityBase.ServiceDefault();
  middleware = new EntityBase.MiddlewareDefault();
  storage = new EntityBase.StorageDefault();
  response = new EntityBase.ResponseDefault();
  tenant = new EntityBase.TenantDefault();
}
namespace Connector {
  export namespace Types {
    export type Context = EntityBase.Types.Context;
    export type Next = EntityBase.Types.Next;
    export interface IOnStartup extends EntityBase.Types.IOnStartup {}
  }
}
export default Connector;
