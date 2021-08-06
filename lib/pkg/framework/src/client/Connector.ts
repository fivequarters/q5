import EntityBase from './EntityBase';
import { IOnStartup as IOnStartupInterface } from '../Manager';

class Connector extends EntityBase {
  service = new EntityBase.ServiceDefault();
  middleware = new EntityBase.MiddlewareDefault();
  storage = new EntityBase.StorageDefault();
  response = new EntityBase.ResponseDefault();
}
namespace Connector {
  export type IOnStartup = IOnStartupInterface;
}
export default Connector;
