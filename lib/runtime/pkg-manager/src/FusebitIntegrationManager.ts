import { Context } from './FusebitRouter';
import { FusebitIntegration } from './FusebitIntegration';

interface IIntegrationConfig {
  package: string;
  config: {
    authority: string;
  };
  instance?: FusebitIntegration;
}

interface IIntegrationConfigMap {
  [name: string]: IIntegrationConfig;
}

class FusebitIntegrationManager {
  protected integrations: IIntegrationConfigMap;
  constructor() {
    this.integrations = {};
  }

  public setup(cfg: IIntegrationConfigMap) {
    if (!cfg) {
      return;
    }

    Object.keys(cfg).forEach((name: string) => (this.integrations[name] = cfg[name]));
  }

  public getIntegrationList() {
    return Object.keys(this.integrations);
  }

  public loadIntegration(name: string, cfg: IIntegrationConfig) {
    const Integration = require(cfg.package);
    return (cfg.instance = new Integration({ name, ...cfg }));
  }

  public async getByName(ctx: Context, name: string, lookupKey: string) {
    const cfg = this.integrations[name];
    const inst = cfg.instance ? cfg.instance : this.loadIntegration(name, cfg);
    return inst.instantiate(ctx, lookupKey);
  }

  public clear() {
    this.integrations = {};
  }
}

const integration = new FusebitIntegrationManager();

export default integration;
export { IIntegrationConfig, IIntegrationConfigMap };
