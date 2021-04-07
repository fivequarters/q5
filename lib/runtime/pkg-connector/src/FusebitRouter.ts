import Koa from 'koa';

import Router from '@koa/router';

const httpMethods = ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE'];
const fusebitMethods = ['CRON', 'EVENT'];

class FusebitRouter extends Router {
  constructor() {
    super({ methods: [...httpMethods, ...fusebitMethods] });
  }

  // Type needs to be extracted from @types/koa__router
  public cron(path: string, ...middleware: any[]) {
    this.register(path, ['cron'], middleware, { name: path });
  }

  public on(path: any, ...middleware: any[]) {
    this.register(path, ['event'], middleware, { name: path });
  }
}
/*
    this.handle = serverlessExpress({
      app: this.app,
      eventSource: {
        getRequest: (ctx: FusebitCtx) => ({
          method: 'get',
          path: ctx.cronName || 'default',
          headers: {},
        }),
        getResponse: (ctx: Koa.Context) => ({
          body: ctx.body,
          headers: ctx.headers,
          statusCode: ctx.statusCode,
        }),
      },
    });
*/
type Context = Router.RouterContext;

export { FusebitRouter as default, Context };
