import Koa from 'koa';

import Router from '@koa/router';

const httpMethods = ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE'];
const fusebitMethods = ['CRON', 'EVENT'];

class FusebitRouter extends Router {
  constructor() {
    super({ methods: [...httpMethods, ...fusebitMethods] });
  }

  // Type needs to be extracted from @types/koa__router
  // These two functions could also be deduplicated by someone more skilled than I.
  public cron(name: any, path: any, middleware: any[]) {
    if (typeof path === 'string' || path instanceof RegExp) {
      middleware = Array.prototype.slice.call(arguments, 2);
    } else {
      middleware = Array.prototype.slice.call(arguments, 1);
      path = name;
      name = null;
    }

    this.register(path, ['cron'], middleware, { name });
  }

  public on(name: any, path: any, middleware: any[]) {
    if (typeof path === 'string' || path instanceof RegExp) {
      middleware = Array.prototype.slice.call(arguments, 2);
    } else {
      middleware = Array.prototype.slice.call(arguments, 1);
      path = name;
      name = null;
    }

    this.register(path, ['event'], middleware, { name });
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

export { FusebitRouter as default };
