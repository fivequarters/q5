import { Context } from '../Router';

interface IConnector {
  instantiate(lookupKey: string): any;
}

/** The Manager will handle either integration or connector configurations. */
interface IConfig {
  handler: string;
  components?: IConnectorConfig[];
  configuration: any;
  mountUrl: string;
}
/**
 * IConnectorConfig
 *
 * Configuration for an associated connector, supplied as part of the overall configuration to the
 * ConnectorManager.
 */
interface IConnectorConfig {
  name: string;
  path: string;

  /** Name of the managing npm package for this connector. */
  package: string;

  /** The remote entity ID for this connector. */
  entityId: string;
  entityType: string;

  /** A cached instance object of the initialized package object. */
  cached?: IConnector;
}

/** A collection of associated connectors and their lookup names. */
interface IConnectorConfigMap extends Record<string, IConnectorConfig> {}

/**
 * ConnectorManager
 *
 * The ConnectorManager is responsible for facilitating integrations' connections to connectors, and caching
 * allocated instances of the configured relationship to be used in retrieving credentials from the remote
 * connector for the service.
 */
class IntegrationConnectors {
  private connectors: IConnectorConfigMap;
  constructor(cfg: IConfig) {
    this.connectors = {};
    if (!cfg) {
      return;
    }

    this.connectors =
      cfg.components
        ?.filter((connector) => connector.entityType === 'connector')
        .reduce<IConnectorConfigMap>((acc, cur) => {
          acc[cur.name] = cur;
          return acc;
        }, {}) || {};
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
  public loadConnector(name: string, connectorConfig: IConnectorConfig) {
    const Connector = require(connectorConfig.package);
    return (connectorConfig.cached = new Connector({ name, ...connectorConfig }));
  }

  public getConnectorFunction = (name: string) => {
    const connectorConfig = this.connectors[name];
    return (ctx: Context, tenantId: string) => {
      if (!connectorConfig) {
        throw new Error(
          `Unknown connector ${name}; add it to the configuration (known: ${JSON.stringify(
            Object.keys(this.connectors)
          )})?`
        );
      }
      const activator = connectorConfig.cached ? connectorConfig.cached : this.loadConnector(name, connectorConfig);

      return activator.instantiate(ctx, tenantId);
    };
  };

  public getConnectorsFunction = (names: string[]) => {
    return (ctx: Context, tenantId: string) => {
      return names.reduce<Record<string, any>>((acc, cur) => {
        acc[cur] = this.getConnectorFunction(cur)(ctx, tenantId);
        return acc;
      }, {});
    };
  };
  /**
   * Get a specific instantiated connector manager object by name.
   *
   * Returns a function that accepts a context object and returns an instantiated connector, configured with
   * the appropriate variables pulled from the ctx.  The returned function can be cached and used across
   * multiple calls and endpoints.
   *
   * @param name Connector name
   * @param tenantId A function that converts a Context into a unique string that the connector can use as a
   * key to look up identities.
   */
  public getByName(ctx: Context, name: string, tenantId: string): unknown {
    const connectorConfig = this.connectors[name];
    if (!connectorConfig) {
      throw new Error(
        `Unknown connector ${name}; add it to the configuration (known: ${JSON.stringify(
          Object.keys(this.connectors)
        )})?`
      );
    }
    const activator = connectorConfig.cached ? connectorConfig.cached : this.loadConnector(name, connectorConfig);

    return activator.instantiate(ctx, tenantId);
  }

  public getByNames(ctx: Context, names: string[], tenantId: string): Record<string, unknown> {
    return names.reduce<Record<string, any>>((acc, cur) => {
      acc[cur] = this.getByName(ctx, cur, tenantId);
      return acc;
    }, {});
  }

  // Only used by test routines.
  public clear() {
    this.connectors = {};
  }
}

export { IntegrationConnectors, IConnector, IConnectorConfig, IConnectorConfigMap, IConfig };
