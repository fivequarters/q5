import { OAuthProxyService } from './OAuthProxyService';
import superagent from 'superagent';

export class StackOverflowProxyService extends OAuthProxyService {
  // Add the 'applicationKey' to the return payload.
  public async doTokenRequest(reqBody: Record<string, string>, code: string): Promise<superagent.Response> {
    const response = await super.doTokenRequest(reqBody, code);
    response.body.application_key = this.configuration.applicationKey;
    return response;
  }
}
