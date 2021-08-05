import superagent from 'superagent';
import { Context, IInstanceConnectorConfig } from './';

export default abstract class IntegrationActivator<T> {
  protected abstract instantiate(ctx: Context, lookupKey: string): Promise<T>;

  public config: IInstanceConnectorConfig;
  constructor(cfg: IInstanceConnectorConfig) {
    this.config = cfg;
  }

  /**
   * Request an access token to communicate with specified connector.
   * @returns Promise<string>
   */
  protected async requestConnectorToken({ ctx, lookupKey }: { ctx: Context; lookupKey: string }): Promise<string> {
    const tokenPath = `/api/${lookupKey}/token`;
    const params = ctx.state.params;
    const baseUrl = `${params.endpoint}/v2/account/${params.accountId}/subscription/${params.subscriptionId}/connector/${this.config.entityId}`;
    const tokenResponse = await superagent
      .get(`${baseUrl}${tokenPath}`)
      .set('Authorization', `Bearer ${params.functionAccessToken}`);

    return tokenResponse.body.access_token;
  }
}
