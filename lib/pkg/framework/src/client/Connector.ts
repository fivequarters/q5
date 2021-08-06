import EntityBase from './EntityBase';

class Connector extends EntityBase {
  service = new EntityBase.ServiceDefault();
  middleware = new EntityBase.MiddlewareDefault();
  storage = new EntityBase.StorageDefault();
  response = new EntityBase.ResponseDefault();
}
export default Connector;
