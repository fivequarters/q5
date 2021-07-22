import superagent from 'superagent';
import { Context, IInstanceConnectorConfig } from '@fusebit-int/framework';

export type SdkHandler = (access_token: string) => any;
export default class OAuthConnector {
  public config: IInstanceConnectorConfig;
  private sdkHandler: SdkHandler;
  constructor(cfg: IInstanceConnectorConfig) {
    this.config = cfg;
    this.sdkHandler = OAuthConnector.sdkHandler;
  }

  static sdkHandler = (access_token: string) => {
    return access_token; // Default implementation returns the access token as the item to be applied to the ctx
  };
  static authorizeSdkHandler = (func: SdkHandler) => {
    OAuthConnector.sdkHandler = func;
  };
  public async instantiate(ctx: Context, lookupKey: string) {
    const params = ctx.state.params;

    const baseUrl = `${params.endpoint}/v2/account/${params.accountId}/subscription/${params.subscriptionId}/connector/${this.config.entityId}`;

    // Send request to authority/token passing in the lookupKey
    const tokenResponse = await superagent
      .get(`${baseUrl}/${this.config.path}/${lookupKey}`)
      .set('Authorization', `Bearer ${params.functionAccessToken}`);

    return OAuthConnector.sdkHandler(tokenResponse.body.access_token);
  }
}
