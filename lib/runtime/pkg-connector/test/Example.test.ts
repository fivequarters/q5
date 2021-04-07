import Router, { Manager, Context } from '../src';

describe('Example', () => {
  it('Example implementation', async () => {
    // In the vendor's code:
    const router = new Router();
    router.get('/sendMessage', async (ctx: Context) => {
      ctx.body = 'Message Sent';
    });

    router.cron('default', async (ctx: Context) => {
      ctx.status = 418;
    });

    // In a @fusebit/slack-connector
    class SlackConnector extends Manager {
      public addHttpRoutes() {
        this.router.get('/health', async (ctx, next) => {
          ctx.status = 418;
        });
      }
    }

    // In the top level index.js of the Fusebit function
    const manager = new SlackConnector();
    manager.setup(router, undefined);

    // In the handler in index.js for fusebit events
    let fusebitEventContext: any;

    fusebitEventContext = { body: {}, headers: {}, method: 'GET', path: '/sendMessage' };
    let result = await manager.handle(fusebitEventContext);
    expect(result.body).toBe('Message Sent');

    fusebitEventContext = { body: {}, headers: {}, method: 'GET', path: '/health' };
    result = await manager.handle(fusebitEventContext);
    expect(result.statusCode).toBe(418);

    fusebitEventContext = { body: {}, headers: {}, method: 'CRON', path: 'default' };
    result = await manager.handle(fusebitEventContext);
    expect(result.statusCode).toBe(418);
  });
});
