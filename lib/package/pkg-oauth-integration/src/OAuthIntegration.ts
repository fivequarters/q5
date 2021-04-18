import superagent from 'superagent';

import { Context, IConnectorConfig } from '@fusebit-int/pkg-manager';

// An example class that pairs with the OAuthConnector.  Many such classes may pair with the OAuthConnector
// (for those that are fairly generic in their OAuth usage).  There's no expectation nor need for them to
// derive from this particular instance, though by doing so they can super.instantiate() before creating their
// desired SDK specialization.
export default class OAuthIntegration {
  public config: IConnectorConfig;
  constructor(cfg: IConnectorConfig) {
    this.config = cfg;
  }

  // The ctx is needed so that the integration can hook out auth tokens from the request.
  //
  // Normally, this function would return an instantiated SDK object populated and enriched as appropriate.
  // For now, just return the accessToken for the caller to do with as they please.
  public async instantiate(ctx: Context, lookupKey: string) {
    // Send request to authority/token passing in the lookupKey
    const tokenResponse = await superagent
      .get(`${this.config.config.authority}/${lookupKey}/token`)
      .set('Authorization', `Bearer ${ctx.fusebit.functionAccessToken}`);

    // Take the responding token, put it into the object below.
    return {
      accessToken: tokenResponse.body.access_token,
    };
  }
}
