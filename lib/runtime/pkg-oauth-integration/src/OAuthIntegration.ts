import superagent from 'superagent';

import { Context, IConnectorConfig } from '@fusebit-int/pkg-manager';

export default class OAuthIntegration {
  public config: IConnectorConfig;
  constructor(cfg: IConnectorConfig) {
    this.config = cfg;
  }

  // The ctx is needed so that the integration can hook out auth tokens from the request.
  public async instantiate(ctx: Context, lookupKey: string) {
    // Send request to authority/token passing in the lookupKey - XXX accessToken not actually plumbed into
    // the context yet.
    const tokenResponse = await superagent
      .get(`${this.config.config.authority}/${lookupKey}/token`)
      .set('Authorization', `Bearer ${ctx.fusebit.functionAccessToken}`);

    console.log(`OAuthIntegration::instantiate - ${tokenResponse.status} - ${JSON.stringify(tokenResponse.body)}`);
    // Take the responding token, put it into the object below.
    return {
      accessToken: tokenResponse.body.access_token,
    };
  }
}
