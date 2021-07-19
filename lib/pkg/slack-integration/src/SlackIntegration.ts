import superagent from 'superagent';

import { Context, IInstanceConnectorConfig } from '@fusebit-int/framework';

const { WebClient } = require("@slack/web-api");

/*
 * An example class that pairs with the pkg-oauth-connector/OAuthConnector.  Many such classes may pair with
 * the OAuthConnector (for those that are fairly generic in their OAuth usage).  There's no expectation nor
 * need for them to derive from this particular instance.
 */
export default class SlackIntegration {
  public config: IInstanceConnectorConfig;
  constructor(cfg: IInstanceConnectorConfig) {
    this.config = cfg;
  }

  /*
   * This function will create an authorized wrapper of the Slack SDK client.
   */
  public async instantiate(ctx: Context, lookupKey: string) {
    const params = ctx.state.params;

    const baseUrl = `${params.endpoint}/v2/account/${params.accountId}/subscription/${params.subscriptionId}/connector/${this.config.entityId}`;

    // Send request to authority/token passing in the lookupKey
    const tokenResponse = await superagent
      .get(`${baseUrl}/api/${lookupKey}/token`)
      .set('Authorization', `Bearer ${params.functionAccessToken}`);
      
    return {
      slackClient: new WebClient(tokenResponse.body.access_token),
    };
  }
}
