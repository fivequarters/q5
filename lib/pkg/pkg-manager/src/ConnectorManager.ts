import { Context } from './Router';

interface IConnector {
  instantiate(lookupKey: string): any;
}

/**
 * IInstanceConnectorConfig
 *
 * Configuration for an associated connector, supplied as part of the overall configuration to the
 * ConnectorManager.
 */
interface IInstanceConnectorConfig {
  /** Name of the managing npm package for this connector. */
  package: string;

  /** The remote entity ID for this connector. */
  connector: string;

  /** Configuration of the package, passed in on instantiation. */
  config: {};

  /** A cached instance object of the initialized package object. */
  instance?: IConnector;
}

/** A collection of associated connectors and their lookup names. */
interface IInstanceConnectorConfigMap {
  [name: string]: IInstanceConnectorConfig;
}

/**
 * ConnectorManager
 *
 * The ConnectorManager is responsible for facilitating integrations' connections to connectors, and caching
 * allocated instances of the configured relationship to be used in retrieving credentials from the remote
 * connector for the service.
 */
class ConnectorManager {
  protected connectors: IInstanceConnectorConfigMap;
  constructor() {
    this.connectors = {};
  }

  /**
   * Set up the configuration manager with a collection of connector configurations.
   */
  public setup(cfg: IInstanceConnectorConfigMap) {
    if (!cfg) {
      return;
    }

    Object.keys(cfg).forEach((name: string) => (this.connectors[name] = cfg[name]));
  }

  /**
   * Get a list of all of the connectors configured for this integration.
   * @returns A list of of the friendly connector names
   */
  public getConnectorList(): string[] {
    return Object.keys(this.connectors);
  }

  /**
   * Create an manager for this connector, and cache it locally.
   *
   * @param name Connector name
   * @param cfg The configuration object used to initialize the managing package
   */
  public loadConnector(name: string, cfg: IInstanceConnectorConfig) {
    const Connector = require(cfg.package);
    return (cfg.instance = new Connector({ name, ...cfg }));
  }

  /**
   * Get a specific instantiated connector manager object by name.
   *
   * Returns a function that accepts a context object and returns an instantiated connector, configured with
   * the appropriate variables pulled from the ctx.  The returned function can be cached and used across
   * multiple calls and endpoints.
   *
   * @param name Connector name
   * @param handler A function that converts a Context into a unique string that the connector can use as a
   * key to look up identities.
   */
  public getByName(name: string, handler: (ctx: Context) => string) {
    return (ctx: Context) => {
      const cfg = this.connectors[name];
      if (!cfg) {
        throw new Error(
          `Unknown connector ${name}; add it to the configuration (known: ${JSON.stringify(
            Object.keys(this.connectors)
          )})?`
        );
      }
      const inst = cfg.instance ? cfg.instance : this.loadConnector(name, cfg);

      return inst.instantiate(ctx, handler(ctx));
    };
  }

  // Only used by test routines.
  public clear() {
    this.connectors = {};
  }
}

export { ConnectorManager, IConnector, IInstanceConnectorConfig, IInstanceConnectorConfigMap };
