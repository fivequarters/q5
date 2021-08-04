"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = __importDefault(require("util"));
const koa_1 = __importDefault(require("koa"));
const statuses_1 = __importDefault(require("statuses"));
const node_mocks_http_1 = __importDefault(require("node-mocks-http"));
const Router_1 = require("./Router");
const ConnectorManager_1 = require("./ConnectorManager");
const DefaultRoutes_1 = __importDefault(require("./DefaultRoutes"));
/**
 * Manager
 *
 * The Manager class is responsible for setting up both integration and connector instances within a Fusebit
 * environment.  It sets up the routing tables and event hooking system.
 *
 * The Manager is created by Fusebit, and is not usually invoked directly by an integration except when it's
 * necessary to invoke specific events.
 */
class Manager {
    /** Create a new Manager, using the supplied storage interface as a persistance backend. */
    constructor() {
        this.app = new koa_1.default();
        this.router = new Router_1.Router();
        this.connectors = new ConnectorManager_1.ConnectorManager();
    }
    /** Configure the Manager with the vendor object and error, if any. */
    setup(cfg, vendor, vendorError) {
        this.config = cfg;
        // Load the configuration for the integrations
        this.connectors.setup(cfg.components);
        if (vendorError) {
            this.vendorError = vendorError;
        }
        // Add vendor routes prior to the defaults, to allow for the vendor to add middleware or override default
        // handlers.
        if (vendor) {
            try {
                this.router.use(vendor.routes());
            }
            catch (err) {
                this.vendorError = this.vendorError || err;
            }
        }
        // Add the default routes - these will get overruled by any routes added by the vendor or during the
        // startup phase.
        this.router.use(DefaultRoutes_1.default.routes());
        // Give everything a chance to be initialized - normally, the cfg object would be specialized per router
        // object to allow for routers to have specialized configuration elements, but we will sort that out
        // later.
        this.invoke('startup', { mgr: this, cfg, router: this.router });
    }
    /**
     * Accept a Fusebit event, convert it into a routable context, and execute it through the router.
     * @return the response, in Fusebit format, from executing this event.
     */
    async handle(fusebitCtx) {
        // Convert the context and execute.
        const ctx = this.createRouteableContext(fusebitCtx);
        await this.execute(ctx);
        return this.createResponse(ctx);
    }
    /**
     * Used to call, RPC style, an event function mounted via `.on()`
     * @param event The name of the event to invoke.
     * @param parameters: The set of parameters the event is expecting.
     * @return the body of the response.
     */
    async invoke(event, parameters) {
        const ctx = this.createRouteableContext({
            method: 'EVENT',
            path: event,
            request: { body: {}, rawBody: '', params: {} },
        });
        ctx.event = { parameters: Object.assign(Object.assign({}, parameters), { ctx }) };
        await this.execute(ctx);
        return ctx.body;
    }
    /**
     * Execute a Koa-like context through the Router, and return the payload.
     * @param ctx A Koa-like context
     */
    async execute(ctx) {
        return new Promise(async (resolve) => {
            try {
                // TODO: Need to supply a next, but not sure if it's ever invoked.  Worth looking at the Koa impl at some point.
                await this.router.routes()(ctx, resolve);
                // Peak into the ctx; if it's unserved, throw a 404.
                if (!ctx.routerPath) {
                    ctx.throw(404);
                }
            }
            catch (e) {
                if (e.status !== 404) {
                    console.log(`Manager::execute error: ${require('util').inspect(e)}`);
                }
                e.expose = true;
                this.onError(ctx, e);
            }
            // Extract any data from the response, and specify that in the body.
            const data = ctx.res._getData();
            if (data) {
                ctx.body = data;
            }
            resolve();
        });
    }
    /** Derived from the Koa.context.onerror implementation - do intelligent things when errors happen. */
    onError(ctx, err) {
        if (err == null) {
            return;
        }
        // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
        // See https://github.com/koajs/koa/issues/1466
        // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
        const isNativeError = Object.prototype.toString.call(err) === '[object Error]' || err instanceof Error;
        if (!isNativeError) {
            err = new Error(util_1.default.format('non-error thrown: %j', err));
        }
        const { res } = ctx;
        // Set only the headers specified in the error.
        res.getHeaderNames().forEach((name) => res.removeHeader(name));
        ctx.set(err.headers);
        // force text/plain
        ctx.type = 'text';
        let statusCode = err.status || err.statusCode;
        // ENOENT support
        if (err.code === 'ENOENT') {
            statusCode = 404;
        }
        // default to 500
        if (typeof statusCode !== 'number' || !statuses_1.default(statusCode)) {
            statusCode = 500;
        }
        // respond
        const msg = err.expose ? err.message : `${statusCode}`;
        ctx.status = err.status = statusCode;
        ctx.length = Buffer.byteLength(msg);
        res.end(msg);
    }
    /** Convert from a Fusebit function context into a routable context. */
    createRouteableContext(fusebitCtx) {
        const req = node_mocks_http_1.default.createRequest({
            url: fusebitCtx.path,
            method: fusebitCtx.method,
            headers: fusebitCtx.headers,
            body: fusebitCtx.body,
        });
        const res = node_mocks_http_1.default.createResponse();
        const ctx = this.app.createContext(req, res);
        // Promote several fusebitCtx members directly into the ctx
        //
        // NOTE: this may glitch non-utf-8 encodings; for blame, see koa/lib/request.js's casual use of stringify.
        ctx.query = fusebitCtx.query;
        // TODO: These parameters need a review and some intent.
        ctx.state.params = Object.assign({ accountId: fusebitCtx.accountId, subscriptionId: fusebitCtx.subscriptionId, entityType: fusebitCtx.boundaryId, entityId: fusebitCtx.functionId }, (fusebitCtx.fusebit // Not present during initial startup events, for example.
            ? {
                endpoint: fusebitCtx.fusebit.endpoint,
                baseUrl: `${fusebitCtx.fusebit.endpoint}/v2/account/${fusebitCtx.accountId}/subscription/${fusebitCtx.subscriptionId}/${fusebitCtx.boundaryId}/${fusebitCtx.functionId}`,
                resourcePath: `/account/${fusebitCtx.accountId}/subscription/${fusebitCtx.subscriptionId}/${fusebitCtx.boundaryId}/${fusebitCtx.functionId}${fusebitCtx.path}`,
                functionAccessToken: fusebitCtx.fusebit.functionAccessToken,
            }
            : {}));
        ctx.state.fusebit = Object.assign(Object.assign({}, fusebitCtx.fusebit), { caller: fusebitCtx.caller });
        ctx.state.manager = this;
        // Pre-load the status as OK
        ctx.status = 200;
        return ctx;
    }
    /** Convert the routable context into a response that the Fusebit function expects. */
    createResponse(ctx) {
        const result = Object.assign({ body: ctx.body, headers: ctx.response.header, status: ctx.status }, (typeof ctx.body === 'string' ? { bodyEncoding: 'utf8' } : {}));
        return result;
    }
}
exports.Manager = Manager;
//# sourceMappingURL=Manager.js.map