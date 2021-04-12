import FusebitRouter, { FusebitManager, Context, Next } from '../src';

describe('Example', () => {
  it('Example implementation', async () => {
    /////////////////////////////////////////////////////////////////////////
    // Vendor's Code: @vendor/slack7/index.js
    //
    // Implied:
    //   import Router from '@fusebit/slack-connector';
    const router = new FusebitRouter();

    router.get('/sendMessage', async (ctx: Context) => {
      ctx.body = 'Message Sent';
    });

    router.cron('default', async (ctx: Context) => {
      ctx.status = 418;
    });

    // Show off event middleware; not super ideal, but workable.
    router.on('healthCheck', async ({ ctx }: { ctx: any }, next: any) => {
      // The result from the normal-style event handler has the return value stored in the `ctx.body`.
      await next();
      return ctx.body + 1;
    });

    // Show off a simple event handler
    router.on('healthCheck', async ({ lastHealth }: { lastHealth: number }) => {
      // This return value is stored in the ctx.body by the router.
      return lastHealth + 1;
    });

    /////////////////////////////////////////////////////////////////////////
    // Owned by Fusebit: @fusebit/slack-connector/index.js
    class SlackConnector extends FusebitManager {
      public addHttpRoutes() {
        this.router.get('/health', async (ctx: Context, next: Next) => {
          // Example of calling an "event" extension.
          ctx.status = await this.invoke('healthCheck', { lastHealth: 416 });
        });
      }
    }

    /////////////////////////////////////////////////////////////////////////
    // Created by function-api: Fusebit Function nodejs['index.js']:
    //
    // Implied:
    //   const router = require('@vendor/slack7');
    const manager = new SlackConnector();
    manager.setup(router, undefined);

    /////////////////////////////////////////////////////////////////////////
    // Test Calls

    // A request for 'GET /sendMessage':
    let fusebitEventContext: any;

    fusebitEventContext = { body: {}, headers: {}, method: 'GET', path: '/sendMessage' };
    let result = await manager.handle(fusebitEventContext);
    expect(result.body).toBe('Message Sent');

    // A request for 'GET /health':
    fusebitEventContext = { body: {}, headers: {}, method: 'GET', path: '/health' };
    result = await manager.handle(fusebitEventContext);
    expect(result.statusCode).toBe(418);

    // The CRON triggers:
    //
    // Implied, in fusebit.json:
    //   cron: {
    //     default: {
    //       schedule: '* * * * *'
    //     }
    //   }
    fusebitEventContext = { body: {}, headers: {}, method: 'CRON', path: 'default' };
    result = await manager.handle(fusebitEventContext);
    expect(result.statusCode).toBe(418);
  });
});
