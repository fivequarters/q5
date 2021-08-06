import EntityBase from './EntityBase';
import { Context as ContextType, Next as NextType } from '../Router';
import { IOnStartup as IOnStartupInterface } from '../Manager';

class Connector extends EntityBase {
  service = new EntityBase.ServiceDefault();
  middleware = new EntityBase.MiddlewareDefault();
  storage = new EntityBase.StorageDefault();
  tenant = new EntityBase.TenantDefault();
  response = new EntityBase.ResponseDefault();
}
namespace Connector {
  export type IOnStartup = IOnStartupInterface;
  export type Context = ContextType;
  export type Next = NextType;
}
export default Connector;
