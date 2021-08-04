"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ConnectorManager
 *
 * The ConnectorManager is responsible for facilitating integrations' connections to connectors, and caching
 * allocated instances of the configured relationship to be used in retrieving credentials from the remote
 * connector for the service.
 */
class ConnectorManager {
    constructor() {
        this.connectors = {};
    }
    /**
     * Set up the configuration manager with a collection of connector configurations.
     */
    setup(cfg) {
        if (!cfg) {
            return;
        }
        cfg.forEach((connector) => {
            if (connector.entityType === 'connector') {
                this.connectors[connector.name] = connector;
            }
        });
    }
    /**
     * Get a list of all of the connectors configured for this integration.
     * @returns A list of of the friendly connector names
     */
    getConnectorList() {
        return Object.keys(this.connectors);
    }
    /**
     * Create an manager for this connector, and cache it locally.
     *
     * @param name Connector name
     * @param cfg The configuration object used to initialize the managing package
     */
    loadConnector(name, cfg) {
        const Connector = require(cfg.package);
        return (cfg.instance = new Connector(Object.assign({ name }, cfg)));
    }
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
    getByName(name, tenantId) {
        return (ctx) => {
            const cfg = this.connectors[name];
            if (!cfg) {
                throw new Error(`Unknown connector ${name}; add it to the configuration (known: ${JSON.stringify(Object.keys(this.connectors))})?`);
            }
            const inst = cfg.instance ? cfg.instance : this.loadConnector(name, cfg);
            return inst.instantiate(ctx, tenantId);
        };
    }
    getByNames(names, tenantId) {
        return (ctx) => {
            return names.reduce((acc, cur) => {
                acc[name] = this.getByName(name, tenantId)(ctx);
                return acc;
            }, {});
        };
    }
    // Only used by test routines.
    clear() {
        this.connectors = {};
    }
}
exports.ConnectorManager = ConnectorManager;
//# sourceMappingURL=ConnectorManager.js.map