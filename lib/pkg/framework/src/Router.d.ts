/// <reference types="koa__router" />
/// <reference types="node" />
import Koa from 'koa';
import { IncomingMessage } from 'http';
import KoaRouter from '@koa/router';
import { Manager } from './Manager';
/** Elements that get added to the stock Koa context. */
interface IContext {
    /** The parameters for an event invocation. */
    event?: any;
    /** Special context provided by Fusebit. */
    fusebit?: any;
    /** Add `body` to the req. */
    req: IncomingMessage & {
        body?: any;
    };
}
/** The general purpose type for ctx parameters on routes and events. */
declare type Context = KoaRouter.RouterContext & IContext;
/** The type of the next parameter on routes and event handlers. */
declare type Next = Koa.Next;
/**
 * Router
 *
 * Router extends the pattern defined by a Koa.Router, and supports all of the usual HTTP verbs. As such, an
 * integration can create a handler on an arbitrary URL endpoint in a simple fashion:
 *   router.get('/hello', async (ctx) => { ctx.body = 'Hello World'; });
 *
 * This object follows the pattern established originally in Express and extended by Koa. The documentation at
 * `https://koajs.com` can be used as a reference.
 */
declare class Router extends KoaRouter {
    manager?: Manager;
    /** Create a new Router. */
    constructor();
    /**
     * Cron events get to be named (the 'path' parameter) in the fusebit.json object with a particular schedule.
     * On execution, they get mapped to particular handlers declared via `.cron(name, ...)`.
     *
     * The response is discarded, outside of analytics and event reporting.
     *
     * @param name the name of the cron schedule
     * @param middleware handle the Koa request
     */
    cron(name: string, ...middleware: any[]): void;
    /**
     * Register for an event.
     *
     * Each event is invoked with the set of parameters as an object in the first parameter, followed by an
     * optional next parameter for event chaining support.
     */
    on(path: any, ...middleware: any[]): void;
}
export { Router, Context, Next };
//# sourceMappingURL=Router.d.ts.map