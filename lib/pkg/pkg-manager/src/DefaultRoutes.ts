import { Router, Manager, Context, Next, IOnStartup } from './';

const router = new Router();

let manager: Manager;

/**
 * On startup, save the manager object for use in other routes.
 */
router.on('startup', async ({ mgr, cfg, router: rtr, storage }: IOnStartup, next: Next) => {
  manager = mgr;
});

/**
 * Annotate the health status with information on whether the vendor code loaded correctly.
 */
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
