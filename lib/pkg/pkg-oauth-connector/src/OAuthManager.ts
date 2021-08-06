import { Internal, Connector } from '@fusebit-int/framework';
import { OAuthEngine, IOAuthConfig } from './OAuthEngine';

import { callbackSuffixUrl } from './OAuthConstants';
import IdentityClient from './IdentityClient';

const connector = new Connector();
const router = connector.router;

let engine: OAuthEngine;

router.use(async (ctx: Internal.Context, next: Internal.Next) => {
  if (engine) {
    engine.setMountUrl(ctx.state.params.baseUrl);
    ctx.state.identityClient = new IdentityClient({
      accessToken: ctx.state.params.functionAccessToken,
      ...ctx.state.params,
    });
  }
  return next();
});

router.on('startup', async ({ mgr, cfg, router: rtr }: Internal.IOnStartup, next: Internal.Next) => {
  // Router's already been mounted, so any further additions need to happen here on 'rtr'.
  //
  // Create the engine, now that the configuration has been loaded.
  engine = new OAuthEngine(cfg.configuration as IOAuthConfig, rtr);

  return next();
});

// Internal Endpoints
router.delete('/', async (ctx: Internal.Context, next: Internal.Next) => {
  await ctx.state.manager.invoke('uninstall', {});
  return next();
});

router.get('/api/:lookupKey/health', async (ctx: Internal.Context) => {
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

router.get('/api/session/:lookupKey/token', async (ctx: Internal.Context) => {
  try {
    ctx.body = await engine.ensureAccessToken(ctx, ctx.params.lookupKey, false);
  } catch (error) {
    ctx.throw(500, error.message);
  }
  if (!ctx.body) {
    ctx.throw(404);
  }
});

router.get('/api/:lookupKey/token', async (ctx: Internal.Context) => {
  try {
    ctx.body = await engine.ensureAccessToken(ctx, ctx.params.lookupKey);
  } catch (error) {
    ctx.throw(500, error.message);
  }
  if (!ctx.body) {
    ctx.throw(404);
  }
});

router.delete('/api/:lookupKey', async (ctx: Internal.Context) => {
  ctx.body = await engine.deleteUser(ctx, ctx.params.lookupKey);
});

// OAuth Flow Endpoints
router.get('/api/authorize', async (ctx: Internal.Context) => {
  ctx.redirect(await engine.getAuthorizationUrl(ctx.query.session));
});

router.get('/api/form', Internal.Middleware.authorize('connector:put'), async (ctx: Internal.Context) => {
  ctx.body = {
    data: ctx.state.manager.config.configuration,
    schema: {
      type: 'object',
      properties: {
        scope: {
          title: 'Comma separated scopes to request from the OAuth server',
          type: 'string',
        },
        clientId: {
          title: 'The client ID issued by the OAuth server',
          type: 'string',
        },
        tokenUrl: {
          type: 'string',
        },
        clientSecret: {
          type: 'string',
        },
        authorizationUrl: {
          type: 'string',
        },
        refreshErrorLimit: {
          type: 'integer',
        },
        refreshInitialBackoff: {
          type: 'integer',
        },
        refreshWaitCountLimit: {
          type: 'integer',
        },
        refreshBackoffIncrement: {
          type: 'integer',
        },
        accessTokenExpirationBuffer: {
          type: 'integer',
        },
      },
      required: ['scope', 'clientId', 'clientSecret', 'tokenUrl', 'authorizationUrl'],
    },
    uischema: {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Control',
          scope: '#/properties/scope',
        },
        {
          type: 'Control',
          scope: '#/properties/clientId',
        },
        {
          type: 'Control',
          scope: '#/properties/tokenUrl',
        },
        {
          type: 'Control',
          scope: '#/properties/clientSecret',
        },
        {
          type: 'Control',
          scope: '#/properties/authorizationUrl',
        },
        {
          type: 'Control',
          scope: '#/properties/refreshErrorLimit',
        },
        {
          type: 'Control',
          scope: '#/properties/refreshInitialBackoff',
        },
        {
          type: 'Control',
          scope: '#/properties/refreshWaitCountLimit',
        },
        {
          type: 'Control',
          scope: '#/properties/refreshBackoffIncrement',
        },
        {
          type: 'Control',
          scope: '#/properties/accessTokenExpirationBuffer',
        },
      ],
    },
  };
});

router.get(callbackSuffixUrl, async (ctx: Internal.Context) => {
  const state = ctx.query.state;
  const code = ctx.query.code;

  if (!code) {
    ctx.throw(400, 'Missing code query parameter');
  }

  try {
    await engine.convertAccessCodeToToken(ctx, state, code);
    return await engine.redirectToCallback(ctx);
  } catch (e) {
    ctx.throw(e.status, `${e.response?.text} - ${e.stack}`);
  }
});

export default connector;
