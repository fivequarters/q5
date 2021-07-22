/**
 * Fusebit, Inc. Slack Connector
 *
 * Alternate ways to consume "Setup" ->
 *
 * Option 1: Default usage (keep default config/sdkHandler)
 *
 * const { Connector, router } = Setup();
 * export default router;
 * export { Connector };
 *
 *
 * Option 2: Split usage of `setup` into 2 files, one for integration/connector fusebit.json
 *
 * ########################### "@fusebit-int/slack-connector" ###########################
 *
 * const { WebClient } = require('@slack/web-api');
 *
 * const sdkHandler = (access_token: string) => {
 *  return new WebClient(access_token);
 * };
 * export const { Connector } = Setup({ sdkHandler });
 *
 * ########################### "@fusebit-int/slack-integration" ###########################
 * const config = {
 *   tokenUrl: 'https://slack.com/api/oauth.v2.access',
 *   authorizationUrl: 'https://slack.com/oauth/v2/authorize',
 * };
 * const { router } = Setup({config});
 * export default router;
 */
import Setup from '@fusebit-int/pkg-oauth-connector';
const { WebClient } = require('@slack/web-api');
const config = {
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  authorizationUrl: 'https://slack.com/oauth/v2/authorize',
};
const sdkHandler = (access_token: string) => {
  return new WebClient(access_token);
};
const { Connector, router } = Setup({ config, sdkHandler });
export default router;
export { Connector };
