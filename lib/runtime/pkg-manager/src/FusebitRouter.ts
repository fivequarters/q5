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
    this.register(
      path,
      ['event'],
      // Use the parameters instead of the ctx as the first parameter, and save the result in the ctx.body
      middleware.map((m) => async (ctx: Router.RouterContext, next: Koa.Next) => {
        ctx.body = await m((ctx as any).event.parameters, next);
      }),
      { name: path }
    );
  }

  // Typescript yells at me without these... I don't know why.
  public get(path: any, ...middleware: any[]): Router {
    return super.get(path, ...middleware);
  }
  public delete(path: any, ...middleware: any[]): Router {
    return super.delete(path, ...middleware);
  }
}

interface IFusebitContext {
  fusebit: any;
  body: any;
}

type Context = Router.RouterContext & IFusebitContext;
type Next = Koa.Next;

export { FusebitRouter as default, Context, Next };
