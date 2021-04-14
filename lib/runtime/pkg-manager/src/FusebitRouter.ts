import Koa from 'koa';

import Router from '@koa/router';

import { FusebitManager } from './FusebitManager';

interface IFusebitContext {
  event: any;
  fusebit: any;
  body: any;
}

type Context = Router.RouterContext & IFusebitContext;
type Next = Koa.Next;

const httpMethods = ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE'];
const fusebitMethods = ['CRON', 'EVENT'];

class FusebitRouter extends Router {
  public manager?: FusebitManager;

  constructor() {
    super({ methods: [...httpMethods, ...fusebitMethods] });
  }

  // Cron events get to be named (the 'path' parameter) in the fusebit.json object with a particular schedule.
  // On execution, they get mapped to particular handlers declared via `.cron(name, ...)`.
  //
  // TODO: Type for middleware needs to be extracted from @types/koa__router
  public cron(path: string, ...middleware: any[]) {
    this.register(path, ['cron'], middleware, { name: path });
  }

  // Register for an event.
  //
  // Calling convention changes slightly here - instead of the normal Koa-ism of `async (ctx, next)`, we treat
  // this more as a function invocation, so it looks like `async (parameters, next)`, with the return value
  // auto-loaded into the body.  This is purely syntactic sugar to make it a little easier to cleanly
  // implement events that are responsible for generating values, for example, or objects.
  //
  // TODO: Type for middleware needs to be extracted from @types/koa__router
  public on(path: any, ...middleware: any[]) {
    this.register(
      path,
      ['event'],
      // Use the parameters instead of the ctx as the first parameter, and save the result in the ctx.body
      middleware.map((m) => async (ctx: Router.RouterContext, next: Koa.Next) => {
        ctx.body = await m((ctx as Context).event.parameters, next);
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

export { FusebitRouter as default, Context, Next };
