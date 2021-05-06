import util from 'util';
import Koa from 'koa';

import statuses from 'statuses';

import httpMocks from 'node-mocks-http';

import FusebitRouter, { Context, Next } from './FusebitRouter';

import FusebitConnectorManager, { IConnectorConfig } from './FusebitConnectorManager';

import DefaultRoutes from './DefaultRoutes';

type VendorModuleError = any;
interface IFusebitIntegrationConfig {
  connectors: { [connectorName: string]: IConnectorConfig };
}
type IFusebitConnectorConfig = any;

type IFusebitConfig = IFusebitIntegrationConfig | IFusebitConnectorConfig;

type FusebitRequestContext = any;
type InvokeParameters = any;

interface IStorage {
  accessToken: string;
  get: (key: string) => Promise<any>;
  put: (data: any, key: string) => Promise<void>;
  delete: (key: string | undefined, flag?: boolean) => Promise<void>;
}

interface IOnStartup {
  router: FusebitRouter;
  mgr: FusebitManager;
  cfg: IFusebitConfig;
  storage: IStorage;
}

class FusebitManager {
  // Error cached from vendor code.
  public vendorError: any;

  // Used for context creation.
  public app: Koa;

  // Route requests and events to specific endpoint handlers.
  public router: FusebitRouter;

  public storage: IStorage;

  constructor(storage: IStorage) {
    this.app = new Koa();
    this.router = new FusebitRouter();
    this.storage = storage;
  }

  public setup(cfg: IFusebitConfig, vendor?: FusebitRouter, vendorError?: VendorModuleError) {
    // Load the configuration for the integrations
    FusebitConnectorManager.setup(cfg.connectors);

    if (vendorError) {
      this.vendorError = vendorError;

      // Add the default routes even when the vendor code hasn't loaded correctly.
      this.router.use(DefaultRoutes.routes());
      return;
    }

    // Add vendor routes prior to the defaults, to allow for the vendor to add middleware or override default
    // handlers.
    if (vendor) {
      this.router.use(vendor.routes());
    }

    // Give everything a chance to be initialized - normally, the cfg object would be specialized per router
    // object to allow for routers to have specialized configuration elements, but we will sort that out
    // later.
    this.invoke('startup', { mgr: this, cfg, router: this.router, storage: this.storage });

    // Add the default routes - these will get overruled by any routes added by the vendor or during the
    // startup phase.
    this.router.use(DefaultRoutes.routes());
  }

  // Accept a Fusebit Function event, convert it into a routable context, and execute it through the router.
  // Return a valid Fusebit response from the Context.
  public async handle(fusebitCtx: FusebitRequestContext) {
    // Update the security context for this particular call in the storage object - this is the only object
    // that's cached between calls, so it gets special treatment.
    this.storage.accessToken = fusebitCtx.fusebit ? fusebitCtx.fusebit.functionAccessToken : '';

    // Convert the context and execute.
    const ctx = this.createRouteableContext(fusebitCtx);
    await this.execute(ctx);
    const response = this.createFusebitResponse(ctx);

    // Clear the accessToken after handling this call is completed.
    this.storage.accessToken = '';

    return response;
  }

  // Used to call, RPC style, an event function mounted via `.on()`
  public async invoke(event: string, parameters: InvokeParameters) {
    const ctx = this.createRouteableContext({
      method: 'EVENT',
      path: event,
      request: { body: {}, rawBody: '', params: {} },
    });
    ctx.event = { parameters: { ...parameters, ctx } };
    await this.execute(ctx);
    return ctx.body;
  }

  // Find the matching route for a Context and send it down the middleware chain to be handled.
  protected async execute(ctx: Context) {
    return new Promise(async (resolve) => {
      try {
        // TODO: Need to supply a next, but not sure if it's ever invoked.  Worth looking at the Koa impl at some point.
        await this.router.routes()(ctx as any, resolve as Koa.Next);

        // Peak into the ctx; if it's unserved, throw a 404.
        if (!(ctx as any).routerPath) {
          ctx.throw(404);
        }
      } catch (e) {
        if (e.status !== 404) {
          console.log(`FusebitManager::execute error: ${require('util').inspect(e)}`);
        }
        e.expose = true;
        this.onError(ctx, e);
      }

      // Extract any data from the response, and specify that in the body.
      const data = (ctx.res as any)._getData();
      if (data) {
        ctx.body = data;
      }
      resolve();
    });
  }

  // Derived from the Koa.context.onerror implementation - do intelligent things when errors happen.
  protected onError(ctx: Context, err: any) {
    if (err == null) {
      return;
    }

    // When dealing with cross-globals a normal `instanceof` check doesn't work properly.
    // See https://github.com/koajs/koa/issues/1466
    // We can probably remove it once jest fixes https://github.com/facebook/jest/issues/2549.
    const isNativeError = Object.prototype.toString.call(err) === '[object Error]' || err instanceof Error;
    if (!isNativeError) {
      err = new Error(util.format('non-error thrown: %j', err));
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
    if (typeof statusCode !== 'number' || !statuses(statusCode)) {
      statusCode = 500;
    }

    // respond
    const msg = err.expose ? err.message : `${statusCode}`;
    ctx.status = err.status = statusCode;
    ctx.length = Buffer.byteLength(msg);

    res.end(msg);
  }

  // Convert from a Fusebit Function context into a routable context.
  public createRouteableContext(fusebitCtx: FusebitRequestContext): Context {
    const req = httpMocks.createRequest({
      url: fusebitCtx.path,
      method: fusebitCtx.method,
      headers: fusebitCtx.headers,
      body: fusebitCtx.body,
    });

    const res = httpMocks.createResponse();

    const ctx = this.app.createContext(req, res) as any;

    // Promote several fusebitCtx members directly into the ctx
    //
    // NOTE: this may glitch non-utf-8 encodings; for blame, see koa/lib/request.js's casual use of stringify.
    ctx.query = fusebitCtx.query;

    ctx.params = fusebitCtx.params;
    ctx.fusebit = fusebitCtx.fusebit;

    // Pre-load the status as OK
    ctx.status = 200;

    return ctx;
  }

  // Convert the routable context into a response that the Fusebit Function expects.
  public createFusebitResponse(ctx: Context) {
    const result = {
      body: ctx.body,
      headers: ctx.response.header,
      status: ctx.status,
      ...(typeof ctx.body === 'string' ? { bodyEncoding: 'utf8' } : {}),
    };

    return result;
  }
}

export { FusebitManager, IStorage, IOnStartup };
