import EntityBase from './EntityBase';
import { Context, Next } from '../Router';
import { IntegrationConnectors } from './IntegrationConnectors';
// @ts-ignore
let config: IConfig;
try {
  config = require('./fusebitConfig');
} catch (e) {
  config = require('./fusebit_integration');
}

class Middleware extends EntityBase.MiddlewareBase {
  loadConnector = (name: string) => async (ctx: Context, next: Next) => undefined; //TODO
}
class Service extends EntityBase.ServiceBase {
  constructor() {
    super();
    this.IntegrationConnectors = new IntegrationConnectors(config);
  }
  private readonly IntegrationConnectors: IntegrationConnectors;

  getSdk = this.IntegrationConnectors.getByName;

  getSdks = this.IntegrationConnectors.getByNames;
}
namespace Service {
  export const connectors = config;
}
export default class Integration extends EntityBase {
  service = new Service();
  middleware = new Middleware();
  storage = new EntityBase.StorageDefault();
  tenant = new EntityBase.TenantDefault();
  response = new EntityBase.ResponseDefault();
}
