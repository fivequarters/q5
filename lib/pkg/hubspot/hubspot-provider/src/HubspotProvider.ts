import { Internal } from '@fusebit-int/framework';
import { Client } from '@hubspot/api-client';

export default class HubspotProvider extends Internal.ProviderActivator<Client> {
  /*
   * This function will create an authorized wrapper of the HubSpot SDK client.
   */
  protected async instantiate(ctx: Internal.Types.Context, lookupKey: string): Promise<Client> {
    const accessToken = await this.requestConnectorToken({ ctx, lookupKey });
    const hubspotClient = new Client({ accessToken });
    return hubspotClient;
  }
}
