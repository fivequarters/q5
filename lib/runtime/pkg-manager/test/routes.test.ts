import FusebitRouter, { FusebitManager, Context, Next, IStorage } from '../src';

const request = (method: string, path: string, query?: any) => {
  return { body: {}, headers: {}, method, path, query };
};

const storage = {};

describe('Routes', () => {
  it('do routes work', async () => {
    const router = new FusebitRouter();
    router.get('/hello/:username', async (ctx: Context) => {
      ctx.body = `hello${ctx.params.username}`;
    });

    const manager = new FusebitManager(storage as IStorage);
    manager.setup({}, router, undefined);

    const result = await manager.handle(request('GET', '/hello/user'));

    expect(result.body).toBe('hellouser');
    expect(result.status).toBe(200);
    expect(result.body).toBe('hellouser');
  });
  it('unknown requests return 404', async () => {
    const router = new FusebitRouter();
    const manager = new FusebitManager(storage as IStorage);
    manager.setup({}, router, undefined);

    const result = await manager.handle(request('GET', '/notfound'));

    expect(result.status).toBe(404);
  });
});
