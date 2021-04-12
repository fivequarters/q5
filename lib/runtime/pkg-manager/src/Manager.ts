import util from 'util';
import Koa from 'koa';
import Router from '@koa/router';

import httpMocks from 'node-mocks-http';

import { IncomingMessage, ServerResponse } from 'http';
import FusebitRouter, { Context } from './FusebitRouter';

interface IStorage {
  get: (key: string) => Promise<any>;
  put: (data: any, key: string) => Promise<void>;
  delete: (key: string | undefined, flag?: boolean) => Promise<void>;
}

class FusebitManager {
  private error: any;

  // Used for context creation.
  public app: Koa;
  // Used for endpoints declared in this object.
  public router: FusebitRouter;

  public storage: IStorage;

  constructor(storage: IStorage) {
    this.app = new Koa();
    this.router = new FusebitRouter();
    this.storage = storage;
  }

  // XXX temp pass in of cfg; normally this would be pulled from wherever.
  public setup(vendor?: FusebitRouter, vendorError?: any, cfg?: any) {
    if (vendorError) {
      this.error = vendorError;
      return;
    }

    // Add vendor routes prior to the defaults, to allow for the vendor to add middleware or override default
    // handlers.
    if (vendor) {
      this.router.use(vendor.routes());
    }

    // Add the default routes:
    this.addHttpRoutes();

    // Give everything a chance to be initialized - normally, the cfg object would be specialized per router
    // object, but will sort that out later.
    this.invoke('startup', { mgr: this, cfg, router: this.router, storage: this.storage });
  }

  public addHttpRoutes() {
    this.router.get('/api/health', async (ctx: Router.RouterContext, next: Koa.Next) => {
      await next();

      // If no status has been set, respond with a basic one.
      if (!ctx.status) {
        ctx.body = this.error ? ctx.throw(501, 'invalid vendor data', { error: this.error }) : { status: 'ok' };
      }
    });
  }

  public async handle(fusebitCtx: any) {
    const ctx = this.createKoaCtx(fusebitCtx);
    await this.execute(ctx);
    return this.createFusebitResponse(ctx);
  }

  // Used to call, RPC style, an event function mounted on the router.
  public async invoke(event: string, parameters: any) {
    const ctx = this.createKoaCtx({ method: 'EVENT', path: event, request: { body: {}, rawBody: '', params: {} } });
    (ctx as any).event = { parameters: { ...parameters, ctx } };
    await this.execute(ctx);
    return ctx.body;
  }

  // Need to supply a next, but not sure if it's ever invoked.  Worth looking at the Koa impl at some point.
  protected async execute(ctx: Router.RouterContext) {
    return new Promise(async (resolve) => {
      try {
        await this.router.routes()(ctx as any, resolve as Koa.Next);
        resolve();
      } catch (e) {
        console.log(require('util').inspect(e), JSON.stringify(Object.entries(e)));
      }
    });
  }

  // Derived from the Koa.context.onerror implementation
  protected onError(ctx: Router.RouterContext, err: any) {
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
    if (typeof statusCode !== 'number' || !statuses[statusCode]) {
      statusCode = 500;
    }

    // respond
    const msg = err.expose ? err.message : statusCode;
    ctx.status = err.status = statusCode;
    ctx.length = Buffer.byteLength(msg);
    res.end(msg);
  }
  public createFusebitResponse(ctx: Router.RouterContext) {
    return {
      body: ctx.body,
      header: ctx.response.header,
      statusCode: ctx.status,
    };
  }

  public createKoaCtx(fusebitCtx: any): Router.RouterContext {
    const req = httpMocks.createRequest({
      url: fusebitCtx.path,
      method: fusebitCtx.method,
      params: fusebitCtx.params,
      query: fusebitCtx.query,
    });
    const res = httpMocks.createResponse();

    return this.app.createContext(req, res) as any;
  }
}

export { FusebitManager, IStorage };
