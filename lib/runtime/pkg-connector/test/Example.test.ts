import Router, { Manager, Context } from '../src';

describe('Example', () => {
  it('Example implementation', async () => {
    /////////////////////////////////////////////////////////////////////////
    // Vendor's Code: @vendor/slack7/index.js
    //
    // Implied:
    //   import Router from '@fusebit/slack-connector';
    const router = new Router();

    router.get('/sendMessage', async (ctx: Context) => {
      ctx.body = 'Message Sent';
    });

    router.cron('default', async (ctx: Context) => {
      ctx.status = 418;
    });

    router.on('newUserCreated', async (ctx: Context) => {
      // do something in the database
      //
      // Return 200 (optional; default return value is 200 if unspecified).
      ctx.status = 200;
    });

    /////////////////////////////////////////////////////////////////////////
    // Owned by Fusebit: @fusebit/slack-connector/index.js
    class SlackConnector extends Manager {
      public addHttpRoutes() {
        this.router.get('/health', async (ctx, next) => {
          ctx.status = 418;
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
