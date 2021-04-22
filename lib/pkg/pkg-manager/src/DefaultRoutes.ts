import FusebitRouter, { FusebitManager, Context, Next, IOnStartup } from './';

const router = new FusebitRouter();

let manager: FusebitManager;

router.on('startup', async ({ mgr, cfg, router: rtr, storage }: IOnStartup, next: Next) => {
  manager = mgr;
});

router.get('/api/health', async (ctx: Context, next: Next) => {
  await next();

  // If no status has been set, respond with a basic one.
  if (!ctx.status) {
    ctx.body = manager.vendorError
      ? ctx.throw(501, 'invalid vendor data', { error: manager.vendorError })
      : { status: 'ok' };
  }
});

export default router;
