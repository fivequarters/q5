import { OAuthProxyService } from './OAuthProxyService';
import http_error from 'http-errors';
import superagent from 'superagent';
import { v4 as uuidv4 } from 'uuid';
import RDS from '@5qtrs/db';

export class TwitterProxyService extends OAuthProxyService {
  public getIdentity = async (): Promise<{ peerId: string; peerSecret: string; codeChallenge: string }> => {
    const connector = await RDS.DAO.connector.getEntity({
      accountId: this.accountId,
      subscriptionId: this.subscriptionId,
      id: this.connectorId,
    });
    return {
      peerId: connector.data.configuration.clientId,
      peerSecret: connector.data.configuration.clientSecret,
      codeChallenge: connector.data.configuration.codeChallenge,
    };
  };

  public getAuthorizeUrl = (query: Record<string, string>) => {
    const url = new URL(super.getAuthorizeUrl(query));
    url.searchParams.set('code_challenge_method', 'plain');
    return url.toString();
  };

  // Called on /token, converts the client_id and secret to the correct credentials and masks the
  // refresh_token so that it's unique per authentication pass.
  public async doTokenRequest(reqBody: Record<string, string>, code: string): Promise<superagent.Response> {
    const body: Record<string, string> = {
      ...reqBody,
      client_id: this.configuration.clientId,
      client_secret: this.configuration.clientSecret,
      redirect_uri: process.env.API_SERVER + this.getProxyCallbackPath(),
    };

    if (body.code) {
      body.code = code;
    } else if (body.refresh_token) {
      body.refresh_token = code;
    } else {
      throw http_error(400, 'missing token');
    }

    // Unique Auth model for Twitter
    const basicAuthPlain = `${body.client_id}:${body.client_secret}`;
    const basicAuth = new Buffer(basicAuthPlain).toString('base64');

    // Perform the request with the new id, secret, and refresh_token
    const response = await superagent
      .post(this.configuration.tokenUrl)
      .type('form')
      .set('Accept', 'application/json')
      .set('Authorization', `Basic ${basicAuth}`)
      .send(body)
      .ok(() => true);

    // If a refresh_token was returned, substitute it.
    if (response.body.refresh_token) {
      response.body.refresh_token = await this.saveCode(
        reqBody.client_id,
        reqBody.client_secret,
        uuidv4(),
        response.body.refresh_token
      );
    }

    return response;
  }
}
