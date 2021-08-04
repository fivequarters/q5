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
    name: string;
    path: string;
    /** Name of the managing npm package for this connector. */
    package: string;
    /** The remote entity ID for this connector. */
    entityId: string;
    entityType: string;
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
declare class ConnectorManager {
    protected connectors: IInstanceConnectorConfigMap;
    constructor();
    /**
     * Set up the configuration manager with a collection of connector configurations.
     */
    setup(cfg?: IInstanceConnectorConfig[]): void;
    /**
     * Get a list of all of the connectors configured for this integration.
     * @returns A list of of the friendly connector names
     */
    getConnectorList(): string[];
    /**
     * Create an manager for this connector, and cache it locally.
     *
     * @param name Connector name
     * @param cfg The configuration object used to initialize the managing package
     */
    loadConnector(name: string, cfg: IInstanceConnectorConfig): any;
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
    getByName(name: string, tenantId: string): any;
    getByNames(names: string[], tenantId: string): Record<string, any>;
    clear(): void;
}
export { ConnectorManager, IConnector, IInstanceConnectorConfig, IInstanceConnectorConfigMap };
//# sourceMappingURL=ConnectorManager.d.ts.map