import { Context, IOnStartup, Manager, Next, Router } from '@fusebit-int/pkg-manager';
import { OAuthEngine, IOAuthConfig } from './OAuthEngine';

import { callbackSuffixUrl } from './OAuthConstants';

const router = new Router();

let engine: OAuthEngine;

router.on('startup', async ({ mgr, cfg, router: rtr }: IOnStartup, next: Next) => {
  // Router's already been mounted, so any further additions need to happen here on 'rtr'.
  //
  // Create the engine, now that the configuration has been loaded.
  engine = new OAuthEngine(cfg as IOAuthConfig, rtr);

  return next();
});

// Internal Endpoints
router.delete('/', async (ctx: Context, next: Next) => {
  await ctx.state.manager.invoke('uninstall', {});
  return next();
});

router.get('/api/:lookupKey/health', async (ctx: Context) => {
  engine.setMountUrl(ctx.state.params.baseUrl);
  try {
    if (!(await engine.ensureAccessToken(ctx, ctx.params.lookupKey))) {
      ctx.throw(404);
    }
    ctx.status = 200;
  } catch (error) {
    ctx.status = 500;
    ctx.message = error.message;
  }
});

router.get('/api/:lookupKey/token', async (ctx: Context) => {
  engine.setMountUrl(ctx.state.params.baseUrl);
  try {
    ctx.body = await engine.ensureAccessToken(ctx, ctx.params.lookupKey);
  } catch (error) {
    ctx.throw(500, error.message);
  }
  console.log(`lookup ctx`, ctx.body);
  if (!ctx.body) {
    ctx.throw(404);
  }
});

router.delete('/api/:lookupKey', async (ctx: Context) => {
  engine.setMountUrl(ctx.state.params.baseUrl);
  ctx.body = await engine.deleteUser(ctx, ctx.params.lookupKey);
});

// OAuth Flow Endpoints
router.get('/api/configure', async (ctx: Context) => {
  engine.setMountUrl(ctx.state.params.baseUrl);
  console.log(`pkg-oauth-connector: url: `, await engine.getAuthorizationUrl(ctx.query.state));
  ctx.redirect(await engine.getAuthorizationUrl(ctx.query.state));
});

router.get(callbackSuffixUrl, async (ctx: Context) => {
  engine.setMountUrl(ctx.state.params.baseUrl);
  const state = ctx.query.state;
  const code = ctx.query.code;

  if (!code) {
    ctx.throw(403);
  }
  ctx.body = await engine.convertAccessCodeToToken(ctx, state, code);
});

export { router as default };
