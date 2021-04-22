import { Context } from './FusebitRouter';

interface IConnector {
  instantiate(lookupKey: string): any;
}

interface IConnectorConfig {
  package: string;
  config: {
    authority: string;
  };
  instance?: IConnector;
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

  // Create an manager for this connector, and cache it locally.
  public loadConnector(name: string, cfg: IConnectorConfig) {
    const Connector = require(cfg.package);
    return (cfg.instance = new Connector({ name, ...cfg }));
  }

  // Returns a function that accepts a context object so that the connector can be specified once at the top
  // of an integration, and then invoked with the ctx to create the necessary SDK object within each handler.
  public getByName(name: string, handler: (ctx: Context) => string) {
    return (ctx: Context) => {
      const cfg = this.connectors[name];
      const inst = cfg.instance ? cfg.instance : this.loadConnector(name, cfg);

      return inst.instantiate(ctx, handler(ctx));
    };
  }

  // Only used by test routines.
  public clear() {
    this.connectors = {};
  }
}

const connectors = new FusebitConnectorManager();

export default connectors;
export { IConnector, IConnectorConfig, IConnectorConfigMap };
