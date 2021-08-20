import { Internal } from '@fusebit-int/framework';
import { WebClient } from '@slack/web-api';

export default class SlackProvider extends Internal.ProviderActivator<WebClient> {
  /*
   * This function will create an authorized wrapper of the Slack SDK client.
   */
  protected async instantiate(ctx: Internal.Types.Context, lookupKey: string): Promise<WebClient> {
    const token = await this.requestConnectorToken({ ctx, lookupKey });
    console.log('it works');
    return new WebClient(token);
  }
}
