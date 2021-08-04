import Koa from 'koa';
import { Router, Context } from './Router';
import { ConnectorManager, IInstanceConnectorConfig } from './ConnectorManager';
/** The vendor module failed to load with this error */
declare type VendorModuleError = any;
/** The Manager will handle either integration or connector configurations. */
interface IConfig {
    handler: string;
    components?: IInstanceConnectorConfig[];
    configuration: any;
    mountUrl: string;
}
/** The internal Fusebit request context. passed in through the lambda. */
declare type RequestContext = any;
/** Parameters supplied for an internal event invocation. */
declare type InvokeParameters = any;
/** Placeholder interface for accessing storage. */
interface IStorage {
    accessToken: string;
    get: (key: string) => Promise<any>;
    put: (data: any, key: string) => Promise<void>;
    delete: (key: string | undefined, flag?: boolean) => Promise<void>;
}
/** Type for the OnStartup event parameters. */
interface IOnStartup {
    router: Router;
    mgr: Manager;
    cfg: IConfig;
}
/**
 * Manager
 *
 * The Manager class is responsible for setting up both integration and connector instances within a Fusebit
 * environment.  It sets up the routing tables and event hooking system.
 *
 * The Manager is created by Fusebit, and is not usually invoked directly by an integration except when it's
 * necessary to invoke specific events.
 */
declare class Manager {
    /** @private Error cached from vendor code. */
    vendorError: any;
    /** @private Used for context creation. */
    app: Koa;
    /** @private Route requests and events to specific endpoint handlers. */
    router: Router;
    /** @public Store the configuration as passed in for other consumers. */
    config: IConfig;
    /** @public Connectors attached to this integration. */
    connectors: ConnectorManager;
    /** Create a new Manager, using the supplied storage interface as a persistance backend. */
    constructor();
    /** Configure the Manager with the vendor object and error, if any. */
    setup(cfg: IConfig, vendor?: Router, vendorError?: VendorModuleError): void;
    /**
     * Accept a Fusebit event, convert it into a routable context, and execute it through the router.
     * @return the response, in Fusebit format, from executing this event.
     */
    handle(fusebitCtx: RequestContext): Promise<{
        bodyEncoding: string;
        body: any;
        headers: any;
        status: number;
    } | {
        body: any;
        headers: any;
        status: number;
    }>;
    /**
     * Used to call, RPC style, an event function mounted via `.on()`
     * @param event The name of the event to invoke.
     * @param parameters: The set of parameters the event is expecting.
     * @return the body of the response.
     */
    invoke(event: string, parameters: InvokeParameters): Promise<any>;
    /**
     * Execute a Koa-like context through the Router, and return the payload.
     * @param ctx A Koa-like context
     */
    protected execute(ctx: Context): Promise<unknown>;
    /** Derived from the Koa.context.onerror implementation - do intelligent things when errors happen. */
    protected onError(ctx: Context, err: any): void;
    /** Convert from a Fusebit function context into a routable context. */
    createRouteableContext(fusebitCtx: RequestContext): Context;
    /** Convert the routable context into a response that the Fusebit function expects. */
    createResponse(ctx: Context): {
        bodyEncoding: string;
        body: any;
        headers: any;
        status: number;
    } | {
        body: any;
        headers: any;
        status: number;
    };
}
export { Manager, IStorage, IOnStartup };
//# sourceMappingURL=Manager.d.ts.map