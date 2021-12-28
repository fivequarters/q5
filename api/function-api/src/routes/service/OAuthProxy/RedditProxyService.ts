import { OAuthProxyService } from './OAuthProxyService';
import http_error from 'http-errors';
import superagent from 'superagent';
import { v4 as uuidv4 } from 'uuid';

export class RedditProxyService extends OAuthProxyService {
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

    // Unique Auth model for Reddit
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
