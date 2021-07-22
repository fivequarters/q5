/**
 * Fusebit, Inc. Slack Connector
 */
import { Context, IOnStartup, Middleware, Next, Router, Form } from '@fusebit-int/framework';
const OAuthConnectorRouter = require('@fusebit-int/pkg-oauth-connector');
import { FormUI, FormSchema } from './form';

const router = new Router();
const TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const AUTHORIZATION_URL = 'https://slack.com/oauth/v2/authorize';

router.on('startup', async ({ mgr, cfg, router: rtr }: IOnStartup, next: Next) => {
  cfg.configuration.tokenUrl = TOKEN_URL;
  cfg.configuration.authorizationUrl = AUTHORIZATION_URL;
  return next();
});

router.get('/api/configure', async (ctx: Context) => {
  ctx.body = {
    data: ctx.state.manager.config.configuration,
    schema: FormSchema,
    uischema: FormUI,
  };
});

router.use(OAuthConnectorRouter.routes());
module.exports = router;
