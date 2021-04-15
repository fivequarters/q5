import FusebitRouter, { FusebitManager, Context, Next, IOnStartup } from '@fusebit-int/pkg-manager';
import { OAuthEngine } from './OAuthEngine';

const router = new FusebitRouter();

let engine: OAuthEngine;
let manager: FusebitManager;

router.on('startup', async ({ mgr, cfg, router: rtr, storage }: IOnStartup, next: Next) => {
  // Router's already been mounted, so any further additions need to happen here on 'rtr'.
  //
  // Create the engine, now that the configuration has been loaded.
  engine = new OAuthEngine(cfg, storage, rtr);
  manager = mgr;
  return next();
});

// Internal Endpoints
router.delete('/', async (ctx: Context, next: Next) => {
  await manager.invoke('uninstall', {});
  return next();
});

router.get('/:lookupKey/health', async (ctx: Context) => {
  ctx.body = 200;
});

router.get('/:lookupKey/token', async (ctx: Context) => {
  ctx.body = await engine.ensureAccessToken(ctx.params.lookupKey);
});

router.delete('/:lookupKey', async (ctx: Context) => {
  ctx.body = await engine.deleteUser(ctx.params.lookupKey);
});

// OAuth Flow Endpoints
router.get('/configure', async (ctx: Context) => {
  ctx.redirect(await engine.getAuthorizationUrl(ctx.query.state));
});

router.get('/callback', async (ctx: Context) => {
  const state = ctx.query.state;
  const code = ctx.query.code;

  if (!code) {
    ctx.throw(403);
  }
  ctx.body = await engine.convertAccessCodeToToken(state, code);
});

export { router as default };
