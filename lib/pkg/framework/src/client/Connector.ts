import EntityBase from './EntityBase';

export default class Connector extends EntityBase {
  service = new EntityBase.ServiceDefault();
  middleware = new EntityBase.MiddlewareDefault();
  storage = new EntityBase.StorageDefault();
  tenant = new EntityBase.TenantDefault();
  response = new EntityBase.ResponseDefault();
}
