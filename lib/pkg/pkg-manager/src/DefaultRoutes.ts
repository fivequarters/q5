import { Router, Manager, Context, Next, IOnStartup } from './';

const router = new Router();

let manager: Manager;

/**
 * On startup, save the manager object for use in other routes.
 */
router.on('startup', async ({ mgr, cfg, router: rtr, storage }: IOnStartup, next: Next) => {
  console.log(`in Default Routes startup`);
  manager = mgr;
});

/**
 * Annotate the health status with information on whether the vendor code loaded correctly.
 */
router.get('/api/health', async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (err) {
    return ctx.throw(501, `Failed internal health check: ${err.message}`);
  }

  // If no status has been set, respond with a basic one.
  if (ctx.status === 200 && manager.vendorError) {
    // TODO: The ctx.throw doesn't seem to support an optional parameter, or it gets stripped out later.
    ctx.body = manager.vendorError ? ctx.throw(501, `invalid vendor data: ${manager.vendorError}`) : { status: 'ok' };
  }
});

export default router;
