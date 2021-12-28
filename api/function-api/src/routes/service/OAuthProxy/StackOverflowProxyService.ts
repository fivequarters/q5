import { OAuthProxyService } from './OAuthProxyService';
import superagent from 'superagent';

export class StackOverflowProxyService extends OAuthProxyService {
  // Add the 'clientKey' to the return payload.
  public async doTokenRequest(reqBody: Record<string, string>, code: string): Promise<superagent.Response> {
    const response = await super.doTokenRequest(reqBody, code);
    response.body.client_key = this.configuration.clientKey;
    return response;
  }
}
