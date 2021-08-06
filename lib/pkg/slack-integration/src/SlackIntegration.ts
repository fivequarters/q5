import { Internal } from '@fusebit-int/framework';
import { WebClient } from '@slack/web-api';

export default class SlackIntegration extends Internal.IntegrationActivator<WebClient> {
  /*
   * This function will create an authorized wrapper of the Slack SDK client.
   */
  protected async instantiate(ctx: Internal.Types.Context, lookupKey: string): Promise<any> {
    const token = await this.requestConnectorToken({ ctx, lookupKey });
    const slackClient = await new WebClient(token);
    return token;
  }
}
