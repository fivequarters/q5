import Router, { Manager } from '../src';

describe('Example', () => {
  it('Example implementation', async () => {
    // In the vendor's code:
    const router = new Router();
    router.get('/sendMessage', async (ctx, next) => {
      ctx.body = 'Message Sent';
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
    let result = await manager.handle({ body: {}, headers: {}, method: 'GET', path: '/sendMessage' });
    expect(result.body).toBe('Message Sent');

    result = await manager.handle({ body: {}, headers: {}, method: 'GET', path: '/health' });
    expect(result.statusCode).toBe(418);
  });
});
