import { Context, IOnStartup, Manager, Next, Router } from '@fusebit-int/pkg-manager';
import { OAuthEngine, IOAuthConfig } from './OAuthEngine';

const router = new Router();

let engine: OAuthEngine;
let manager: Manager;

router.on('startup', async ({ mgr, cfg, router: rtr, storage }: IOnStartup, next: Next) => {
  // Router's already been mounted, so any further additions need to happen here on 'rtr'.
  //
  // Create the engine, now that the configuration has been loaded.
  engine = new OAuthEngine(cfg as IOAuthConfig, storage, rtr);
  manager = mgr;
  return next();
});

// Internal Endpoints
router.delete('/', async (ctx: Context, next: Next) => {
  await manager.invoke('uninstall', {});
  return next();
});

router.get('/api/:lookupKey/health', async (ctx: Context) => {
  try {
    if (!(await engine.ensureAccessToken(ctx.params.lookupKey))) {
      ctx.throw(404);
    }
    ctx.status = 200;
  } catch (error) {
    ctx.status = 500;
    ctx.message = error.message;
  }
});

router.get('/api/:lookupKey/token', async (ctx: Context) => {
  try {
    ctx.body = await engine.ensureAccessToken(ctx.params.lookupKey);
    if (!ctx.body) {
      ctx.throw(404);
    }
  } catch (error) {
    ctx.status = 500;
    ctx.message = error.message;
  }
});

router.delete('/api/:lookupKey', async (ctx: Context) => {
  ctx.body = await engine.deleteUser(ctx.params.lookupKey);
});

// OAuth Flow Endpoints
router.get('/api/configure', async (ctx: Context) => {
  ctx.redirect(await engine.getAuthorizationUrl(ctx.query.state));
});

router.get('/api/callback', async (ctx: Context) => {
  const state = ctx.query.state;
  const code = ctx.query.code;

  if (!code) {
    ctx.throw(403);
  }
  ctx.body = await engine.convertAccessCodeToToken(state, code);
});

export { router as default };
