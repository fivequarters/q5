import { IConnectorConfig } from './FusebitConnectorManager';

// Example
class FusebitConnector {
  public config: IConnectorConfig;
  constructor(cfg: IConnectorConfig) {
    this.config = cfg;
  }

  public instantiate(lookupKey: string) {
    console.log(`${this.config.package} => ${this.config.config.authority}`);
    return 'no';
  }
}

export { FusebitConnector };
