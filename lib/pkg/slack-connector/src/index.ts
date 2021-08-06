/**
 * Fusebit, Inc. Slack Connector
 */
import { Connector } from '@fusebit-int/framework';
import OAuthConnector from '@fusebit-int/pkg-oauth-connector';
import { schema, uischema } from './configure';

const connector = new Connector();
const router = connector.router;
const TOKEN_URL = 'https://slack.com/api/oauth.v2.access';
const AUTHORIZATION_URL = 'https://slack.com/oauth/v2/authorize';

router.on('startup', async ({ mgr, cfg }: Connector.Types.IOnStartup, next: Connector.Types.Next) => {
  cfg.configuration.tokenUrl = TOKEN_URL;
  cfg.configuration.authorizationUrl = AUTHORIZATION_URL;
  return next();
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

router.use(OAuthConnector.router.routes());
module.exports = connector;
