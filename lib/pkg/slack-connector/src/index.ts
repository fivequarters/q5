/**
 * Fusebit, Inc. Slack Connector
 */
import { Context, IOnStartup, Middleware, Next, Router, Manager } from '@fusebit-int/framework';
const OAuthConnectorRouter = require('@fusebit-int/pkg-oauth-connector');
import { schema, uischema } from './form';

const router = new Router();
const TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const AUTHORIZATION_URL = 'https://slack.com/oauth/v2/authorize';

let a: Router;
let b: Router;
const routeCombiner = (() => {
  let resolvers: (() => void)[] = [];
  const promiseA: Promise<void> = new Promise((resolver) => resolvers.push(resolver));
  const promiseB: Promise<void> = new Promise((resolver) => resolvers.push(resolver));
  return {
    promise: (async () => {
      await Promise.all([promiseA, promiseB]);
      a!.use(b!.routes());
      return a!;
    })(),
    resolvers,
  };
})();

const setA = (router: Router) => {
  a = router;
  routeCombiner.resolvers[0]();
};

const setB = (router: Router) => {
  b = router;
  routeCombiner.resolvers[0]();
};

interface ISettings {
  scope: string;
  clientId: string;
  clientSecret: string;
}

interface IAdvancedSettings {
  refreshErrorLimit: number;
  refreshInitialBackoff: number;
  refreshWaitCountLimit: number;
  refreshBackoffIncrement: number;
  accessTokenExpirationBuffer: number;
  tokenUrl: string;
  authorizationUrl: string;
}

interface IConfigurationSettings {
  settings: ISettings;
  advanced: IAdvancedSettings;
}

// TODO: Probably we can define better abstractions to deal with Form schema.
const mapConfiguration = (configuration: any): IConfigurationSettings => {
  const {
    scope,
    clientId,
    clientSecret,
    refreshErrorLimit,
    refreshInitialBackoff,
    refreshWaitCountLimit,
    refreshBackoffIncrement,
    accessTokenExpirationBuffer,
    tokenUrl,
    authorizationUrl,
  } = configuration;
  return {
    settings: {
      scope,
      clientId,
      clientSecret,
    },
    advanced: {
      refreshErrorLimit,
      refreshInitialBackoff,
      refreshWaitCountLimit,
      refreshBackoffIncrement,
      accessTokenExpirationBuffer,
      tokenUrl,
      authorizationUrl,
    },
  };
};

router.on('startup', async ({ mgr, cfg, router: rtr }: IOnStartup, next: Next) => {
  cfg.configuration.tokenUrl = TOKEN_URL;
  cfg.configuration.authorizationUrl = AUTHORIZATION_URL;
  setA(rtr);
  return next();
});

router.get('/api/configure', Middleware.authorize('connector:put'), async (ctx: Context) => {
  ctx.body = {
    data: mapConfiguration(ctx.state.manager.config.configuration),
    schema,
    uischema,
  };
});

router.use(OAuthConnectorRouter.routes());
setB(router);
module.exports = router;
