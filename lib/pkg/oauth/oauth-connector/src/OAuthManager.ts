import { Connector } from '@fusebit-int/framework';
import { OAuthEngine, IOAuthConfig } from './OAuthEngine';

import { callbackSuffixUrl } from './OAuthConstants';
import IdentityClient from './IdentityClient';

import { schema, uischema } from './configure';

const connector = new Connector();
const router = connector.router;

let engine: OAuthEngine;

const onSessionError = async (ctx: Connector.Types.Context, error: { error: string; errorDescription?: string }) => {
  await ctx.state.identityClient?.saveErrorToSession({
    error: ctx.query.error,
    errorDescription: ctx.query.error_description,
  });
};

router.use(async (ctx: Connector.Types.Context, next: Connector.Types.Next) => {
  if (engine) {
    engine.setMountUrl(ctx.state.params.baseUrl);
    ctx.state.identityClient = new IdentityClient({
      accessToken: ctx.state.params.functionAccessToken,
      ...ctx.state.params,
    });
  }
  return next();
});

router.on('startup', async ({ mgr, cfg, router: rtr }: Connector.Types.IOnStartup, next: Connector.Types.Next) => {
  // Router's already been mounted, so any further additions need to happen here on 'rtr'.
  //
  // Create the engine, now that the configuration has been loaded.
  engine = new OAuthEngine(cfg.configuration as IOAuthConfig, rtr);

  return next();
});

// Internal Endpoints
router.get('/api/:lookupKey/health', async (ctx: Connector.Types.Context) => {
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

router.get('/api/session/:lookupKey/token', async (ctx: Connector.Types.Context) => {
  try {
    ctx.body = await engine.ensureAccessToken(ctx, ctx.params.lookupKey, false);
  } catch (error) {
    ctx.throw(500, error.message);
  }
  if (!ctx.body) {
    ctx.throw(404);
  }
});

router.get('/api/:lookupKey/token', async (ctx: Connector.Types.Context) => {
  try {
    ctx.body = await engine.ensureAccessToken(ctx, ctx.params.lookupKey);
  } catch (error) {
    ctx.throw(500, error.message);
  }
  if (!ctx.body) {
    ctx.throw(404);
  }
});

router.delete('/api/:lookupKey', async (ctx: Connector.Types.Context) => {
  ctx.body = await engine.deleteUser(ctx, ctx.params.lookupKey);
});

// OAuth Flow Endpoints
router.get('/api/authorize', async (ctx: Connector.Types.Context) => {
  ctx.redirect(await engine.getAuthorizationUrl(ctx.query.session));
});

router.get(
  '/api/configure',
  connector.middleware.authorizeUser('connector:put'),
  async (ctx: Connector.Types.Context) => {
    ctx.body = {
      data: ctx.state.manager.config.configuration,
      schema,
      uischema,
    };
  }
);

router.get(callbackSuffixUrl, async (ctx: Connector.Types.Context) => {
  const state = ctx.query.state;

  if (!state) {
    ctx.throw(400, 'Missing state');
  }

  if (ctx.query.error) {
    // The OAuth exchange has errored out - send back to callback and pass those parameters along.
    onSessionError(ctx, {
      error: ctx.query.error,
      errorDescription: ctx.query.error_description,
    });
    return engine.redirectToCallback(ctx);
  }

  const code = ctx.query.code;

  if (!code) {
    onSessionError(ctx, { error: 'Missing code query parameter from OAuth server' });
    return engine.redirectToCallback(ctx);
  }

  try {
    await engine.convertAccessCodeToToken(ctx, state, code);
  } catch (e) {
    onSessionError(ctx, { error: `Conversion error: ${e.response?.text} - ${e.stack}` });
  }
  return engine.redirectToCallback(ctx);
});

export default connector;