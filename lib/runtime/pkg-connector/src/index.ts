import Koa from 'koa';
import Router from '@koa/router';
import FusebitRouter, { Context } from './FusebitRouter';

class Manager {
  private error: any;

  // Used for endpoints declared in this object.
  public router: FusebitRouter;

  constructor() {
    this.router = new FusebitRouter();
  }

  public setup(vendor?: FusebitRouter, vendorError?: any) {
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
  }

  public addHttpRoutes() {
    this.router.get('/health', async (ctx: Router.RouterContext, next: Koa.Next) => {
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
      await this.router.routes()(ctx as any, resolve as Koa.Next);
      resolve();
    });
  }

  public createFusebitResponse(ctx: Router.RouterContext) {
    return {
      body: ctx.body,
      headers: ctx.headers,
      statusCode: ctx.status,
    };
  }

  public createKoaCtx(fusebitCtx: any): Router.RouterContext {
    // Do silly things.
    const koaCtx = ({
      method: fusebitCtx.method,
      path: fusebitCtx.path,
      request: {
        body: fusebitCtx.body,
        rawBody: fusebitCtx.body,
        params: {},
      },
    } as unknown) as Router.RouterContext;
    return koaCtx;
  }
}

export { FusebitRouter as default, Manager, Context };
