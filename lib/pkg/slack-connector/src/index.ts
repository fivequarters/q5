/**
 * Fusebit, Inc. Slack Connector
 */
import { Context, IOnStartup, Middleware, Next, Router } from '@fusebit-int/framework';
const OAuthConnectorRouter = require('@fusebit-int/pkg-oauth-connector');
import { schema, uischema } from './configure';

const router = new Router();
const TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const AUTHORIZATION_URL = 'https://slack.com/oauth/v2/authorize';

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

router.on('startup', async ({ mgr, cfg }: IOnStartup, next: Next) => {
  cfg.configuration.tokenUrl = TOKEN_URL;
  cfg.configuration.authorizationUrl = AUTHORIZATION_URL;
  return next();
});

router.get('/api/configure', Middleware.authorize('connector:put'), async (ctx: Context) => {
  ctx.body = {
    data: ctx.state.manager.config.configuration,
    schema,
    uischema,
  };
});

router.use(OAuthConnectorRouter.routes());
module.exports = router;
