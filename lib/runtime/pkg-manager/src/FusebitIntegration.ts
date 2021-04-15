import { IIntegrationConfig } from './FusebitIntegrationManager';

// Example
class FusebitIntegration {
  public config: IIntegrationConfig;
  constructor(cfg: IIntegrationConfig) {
    this.config = cfg;
  }

  public instantiate(lookupKey: string) {
    console.log(`${this.config.package} => ${this.config.config.authority}`);
    return 'no';
  }
}

export { FusebitIntegration };
