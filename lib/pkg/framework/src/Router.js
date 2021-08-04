"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = __importDefault(require("@koa/router"));
const httpMethods = ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE'];
const fusebitMethods = ['CRON', 'EVENT'];
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
class Router extends router_1.default {
    /** Create a new Router. */
    constructor() {
        super({ methods: [...httpMethods, ...fusebitMethods] });
    }
    /**
     * Cron events get to be named (the 'path' parameter) in the fusebit.json object with a particular schedule.
     * On execution, they get mapped to particular handlers declared via `.cron(name, ...)`.
     *
     * The response is discarded, outside of analytics and event reporting.
     *
     * @param name the name of the cron schedule
     * @param middleware handle the Koa request
     */
    cron(name, ...middleware) {
        this.register(name, ['cron'], middleware, { name });
    }
    /**
     * Register for an event.
     *
     * Each event is invoked with the set of parameters as an object in the first parameter, followed by an
     * optional next parameter for event chaining support.
     */
    on(path, ...middleware) {
        this.register(path, ['event'], 
        // Use the parameters instead of the ctx as the first parameter, and save the result in the ctx.body
        middleware.map((m) => async (ctx, next) => {
            ctx.body = await m(ctx.event.parameters, next);
        }), { name: path });
    }
}
exports.Router = Router;
//# sourceMappingURL=Router.js.map