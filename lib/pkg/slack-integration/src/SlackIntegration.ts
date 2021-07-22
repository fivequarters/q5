import { Context, IntegrationActivator } from '@fusebit-int/framework';
import { WebClient } from '@slack/web-api';

export default class SlackIntegration extends IntegrationActivator<{ slackClient: WebClient }> {
  /*
   * This function will create an authorized wrapper of the Slack SDK client.
   */
  protected async instantiate(ctx: Context, lookupKey: string): Promise<{ slackClient: WebClient }> {
    const token = await this.requestConnectorToken({ ctx, lookupKey });
    const slackClient = new WebClient(token);
    return { slackClient };
  }
}
