import { Internal } from '@fusebit-int/framework';
import { LinearClient } from '@linear/sdk';

export default class LinearProvider extends Internal.ProviderActivator<LinearClient> {
  /*
   * This function will create an authorized wrapper of the HubSpot SDK client.
   */
  protected async instantiate(ctx: Internal.Types.Context, lookupKey: string): Promise<LinearClient> {
    const accessToken = await this.requestConnectorToken({ ctx, lookupKey });
    return new LinearClient({ accessToken });
  }
}
