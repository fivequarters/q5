import { Context } from './FusebitRouter';
import { FusebitConnector } from './FusebitConnector';

interface IConnectorConfig {
  package: string;
  config: {
    authority: string;
  };
  instance?: FusebitConnector;
}

interface IConnectorConfigMap {
  [name: string]: IConnectorConfig;
}

class FusebitConnectorManager {
  protected connectors: IConnectorConfigMap;
  constructor() {
    this.connectors = {};
  }

  public setup(cfg: IConnectorConfigMap) {
    if (!cfg) {
      return;
    }

    Object.keys(cfg).forEach((name: string) => (this.connectors[name] = cfg[name]));
  }

  public getConnectorList() {
    return Object.keys(this.connectors);
  }

  public loadConnector(name: string, cfg: IConnectorConfig) {
    const Connector = require(cfg.package);
    return (cfg.instance = new Connector({ name, ...cfg }));
  }

  public async getByName(ctx: Context, name: string, lookupKey: string) {
    const cfg = this.connectors[name];
    const inst = cfg.instance ? cfg.instance : this.loadConnector(name, cfg);
    return inst.instantiate(ctx, lookupKey);
  }

  public clear() {
    this.connectors = {};
  }
}

const connectors = new FusebitConnectorManager();

export default connectors;
export { IConnectorConfig, IConnectorConfigMap };
