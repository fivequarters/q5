import { Context, IOnStartup, Next, Router } from '@fusebit-int/framework';
import { OAuthEngine, IOAuthConfig } from './OAuthEngine';

import { callbackSuffixUrl } from './OAuthConstants';
import IdentityClient from './IdentityClient';

const router = new Router();

let engine: OAuthEngine;

router.use(async (ctx: Context, next: Next) => {
  if (engine) {
    engine.setMountUrl(ctx.state.params.baseUrl);
    ctx.state.identityClient = new IdentityClient({
      accessToken: ctx.state.fusebit.functionAccessToken,
      ...ctx.state.params,
    });
  }
  return next();
});

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

router.get('/api/session/:lookupKey/token', async (ctx: Context) => {
  try {
    ctx.body = await engine.ensureAccessToken(ctx, ctx.params.lookupKey, false);
  } catch (error) {
    ctx.throw(500, error.message);
  }
  if (!ctx.body) {
    ctx.throw(404);
  }
});

router.get('/api/:lookupKey/token', async (ctx: Context) => {
  try {
    ctx.body = await engine.ensureAccessToken(ctx, ctx.params.lookupKey);
  } catch (error) {
    ctx.throw(500, error.message);
  }
  if (!ctx.body) {
    ctx.throw(404);
  }
});

router.delete('/api/:lookupKey', async (ctx: Context) => {
  ctx.body = await engine.deleteUser(ctx, ctx.params.lookupKey);
});

// OAuth Flow Endpoints
router.get('/api/configure', async (ctx: Context) => {
  ctx.redirect(await engine.getAuthorizationUrl(ctx.query.session));
});

router.get(callbackSuffixUrl, async (ctx: Context) => {
  const state = ctx.query.state;
  const code = ctx.query.code;

  if (!code) {
    ctx.throw(400, 'Missing code query parameter');
  }

  try {
    await engine.convertAccessCodeToToken(ctx, state, code);
    return await engine.redirectToCallback(ctx);
  } catch (e) {
    ctx.throw(e.status, `${e.response.text} - ${e.stack}`);
  }
});

export { router as default };
