import { Internal, Context } from '@fusebit-int/framework';
import { WebClient } from '@slack/web-api';

export default class SlackIntegration extends Internal.IntegrationActivator<WebClient> {
  /*
   * This function will create an authorized wrapper of the Slack SDK client.
   */
  protected async instantiate(ctx: Context, lookupKey: string): Promise<WebClient> {
    const token = await this.requestConnectorToken({ ctx, lookupKey });
    const slackClient = new WebClient(token);
    return slackClient;
  }
}
