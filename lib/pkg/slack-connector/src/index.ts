/**
 * Fusebit, Inc. Slack Connector
 */
import {IOnStartup, Next, Router } from '@fusebit-int/framework'; // TODO: Export this from the oauth connector
const OAuthConnectorRouter = require('@fusebit-int/pkg-oauth-connector');

import superagent from 'superagent';
const { WebClient } = require('@slack/web-api');

const router = new Router();
// 1. Inject common configuration values for consuming slack sdk.

router.on('startup', async ({ mgr, cfg, router: rtr }: IOnStartup, next: Next) => { 
  cfg.configuration.channel = 'example-slack-connector-v2';
  cfg.configuration.scope = 'chat:write';
  cfg.configuration.tokenUrl = 'https://slack.com/api/oauth.v2.access';
  cfg.configuration.authorizationUrl = 'https://slack.com/oauth/v2/authorize';
  return next();
});

router.use(OAuthConnectorRouter.routes());
module.exports = router;