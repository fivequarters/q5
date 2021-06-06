import superagent from 'superagent';

import { Context, IInstanceConnectorConfig } from '@fusebit-int/pkg-manager';

/*
 * An example class that pairs with the pkg-oauth-connector/OAuthConnector.  Many such classes may pair with
 * the OAuthConnector (for those that are fairly generic in their OAuth usage).  There's no expectation nor
 * need for them to derive from this particular instance.
 */
export default class OAuthIntegration {
  public config: IInstanceConnectorConfig;
  constructor(cfg: IInstanceConnectorConfig) {
    this.config = cfg;
  }

  /*
   * The ctx is needed so that the integration can hook out auth tokens from the request.
   *
   * Normally, this function would return an instantiated SDK object populated and enriched as appropriate.
   * For now, just return the accessToken for the caller to do with as they please.
   */
  public async instantiate(ctx: Context, lookupKey: string) {
    const params = ctx.state.params;

    const baseUrl = `${params.endpoint}/v2/account/${params.accountId}/subscription/${params.subscriptionId}/connector/${this.config.connector}`;

    // Send request to authority/token passing in the lookupKey
    const tokenResponse = await superagent
      .get(`${baseUrl}/api/${lookupKey}/token`)
      .set('Authorization', `Bearer ${ctx.state.fusebit.functionAccessToken}`);

    // Take the responding token, put it into the object below.
    return {
      accessToken: tokenResponse.body.access_token,
    };
  }
}
