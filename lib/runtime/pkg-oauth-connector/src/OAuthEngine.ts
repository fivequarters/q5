import superagent from 'superagent';
import FusebitRouter, { Context, Next, IStorage } from '@fusebit-int/pkg-manager';

import { IOAuthConfig, IOAuthToken } from './OAuthTypes';

class OAuthEngine {
  public cfg: IOAuthConfig;
  public storage: IStorage;
  public router: FusebitRouter;

  constructor(cfg: IOAuthConfig, storage: IStorage, router: FusebitRouter) {
    this.cfg = cfg;
    this.storage = storage;
    this.router = router;

    router.on('uninstall', async (ctx: Context, next: Next) => {
      // Delete all of the storage associated with this object.
      await this.storage.delete(undefined, true);
      return next();
    });
  }

  public async deleteUser(lookupKey: string) {
    return this.storage.delete(lookupKey);
  }

  /**
   * Creates the fully formed web authorization URL to start the authorization flow.
   * @param {string} state The value of the OAuth state parameter.
   */
  public async getAuthorizationUrl(state: string) {
    const params = new URLSearchParams({
      response_type: 'code',
      scope: this.cfg.scope,
      state,
      clientId: this.cfg.clientId,
      redirect_uri: this.cfg.callbackUrl,
    });

    if (this.cfg.audience) {
      params.append('audience', this.cfg.audience);
    }

    return `${this.cfg.authorizationUrl}?${params.toString()}${this.cfg.extraParams ? `&${this.cfg.extraParams}` : ''}`;
  }

  /**
   * Convert the successful callback into a token via getAccessToken.
   */
  public async convertAccessCodeToToken(lookupKey: string, code: string) {
    const token = await this.getAccessToken(code, this.cfg.callbackUrl);
    if (!isNaN(token.expires_in)) {
      token.expires_at = Date.now() + +token.expires_in * 1000;
    }

    token.status = 'authenticated';
    token.timestamp = Date.now();

    await this.storage.put({ data: token }, lookupKey);

    return token;
  }

  /**
   * Exchanges the OAuth authorization code for the access and refresh tokens.
   * @param {string} authorizationCode The authorization_code supplied to the OAuth callback upon successful
   *                                   authorization flow.
   * @param {string} redirectUri The redirect_uri value Fusebit used to start the authorization flow.
   */
  public async getAccessToken(authorizationCode: string, redirectUri: string): Promise<IOAuthToken> {
    const response = await superagent.post(this.cfg.tokenUrl).type('form').send({
      grant_type: 'authorization_code',
      code: authorizationCode,
      clientId: this.cfg.clientId,
      clientSecret: this.cfg.clientSecret,
      redirect_uri: redirectUri,
    });

    return response.body;
  }

  /**
   * Obtains a new access token using refresh token.
   * @param {*} token An object representing the result of the getAccessToken call. It contains refresh_token.
   * @param {string} redirectUri The redirect_uri value Fusebit used to start the authorization flow.
   */
  public async refreshAccessToken(refreshToken: string) {
    const response = await superagent
      .post(this.cfg.tokenUrl)
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        clientId: this.cfg.clientId,
        clientSecret: this.cfg.clientSecret,
        redirect_uri: `${this.cfg.mountUrl}/callback`,
      });

    // Use the current token if a new one isn't supplied.
    return { refresh_token: refreshToken, ...response.body };
  }

  /**
   * Returns a valid access token to the vendor's system representing the vendor's user described by the userContext.
   * For the vendor's system, if the currently stored access token is expired or nearing expiry, and a refresh
   * token is available, a new access token is obtained, stored for future use, and returned. If a current
   * access token cannot be returned, an exception is thrown.
   * @param {*} userContext The vendor user context
   */
  public async ensureAccessToken(lookupKey: string) {
    const token: IOAuthToken = await this.storage.get(lookupKey);

    if (token.status === 'refreshing') {
      // Wait for the currently ongoing refresh operation in a different instance to finish
      return this.waitForRefreshedAccessToken(
        lookupKey,
        this.cfg.refreshWaitCountLimit,
        this.cfg.refreshInitialBackoff
      );
    } else {
      // Get access token for "this" OAuth connector
      return this.ensureLocalAccessToken(lookupKey);
    }
  }

  protected async ensureLocalAccessToken(lookupKey: string) {
    let token: IOAuthToken = await this.storage.get(lookupKey);
    if (
      token.access_token &&
      (token.expires_at === undefined || token.expires_at > Date.now() + this.cfg.accessTokenExpirationBuffer)
    ) {
      return token;
    }

    if (token.refresh_token) {
      token.status = 'refreshing';
      try {
        await this.storage.put({ data: token }, lookupKey);

        token = await this.refreshAccessToken(token.refresh_token);

        if (!isNaN(token.expires_in)) {
          token.expires_at = Date.now() + +token.expires_in * 1000;
        }

        token.status = 'authenticated';
        token.refreshErrorCount = 0;

        await this.storage.put({ data: token }, lookupKey);

        return token;
      } catch (e) {
        if (token.refreshErrorCount > this.cfg.refreshErrorLimit) {
          await this.storage.delete(lookupKey);
          throw new Error(
            `Error refreshing access token. Maximum number of attempts exceeded, identity ${lookupKey} has been deleted: ${e.message}`
          );
        } else {
          token.refreshErrorCount = (token.refreshErrorCount || 0) + 1;
          token.status = 'refresh_error';
          await this.storage.put({ data: token }, lookupKey);
          throw new Error(
            `Error refreshing access token, attempt ${token.refreshErrorCount} out of ${this.cfg.refreshErrorLimit}: ${e.message}`
          );
        }
      }
    }

    // Access token expired, but no refresh token; deleting.
    await this.storage.delete(lookupKey);
    throw new Error(`Access token is expired and cannot be refreshed because the refresh token is not present.`);
  }

  protected async waitForRefreshedAccessToken(lookupKey: string, count: number, backoff: number) {
    if (count <= 0) {
      throw new Error(
        `Error refreshing access token. Waiting for the access token to be refreshed exceeded the maximum time`
      );
    }

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        let token: IOAuthToken;
        try {
          token = await this.storage.get(lookupKey);
          if (!token || token.status === 'refresh_error') {
            throw new Error(`Concurrent access token refresh operation failed`);
          }
        } catch (e) {
          return reject(new Error(`Error waiting for access token refresh: ${e.message}`));
        }
        if (token.status === 'authenticated') {
          return resolve(token);
        }
        let result;
        try {
          result = await this.waitForRefreshedAccessToken(
            lookupKey,
            count - 1,
            Math.floor(backoff * this.cfg.refreshBackoffIncrement)
          );
        } catch (e) {
          return reject(e);
        }
        return resolve(result);
      }, backoff);
    });
  }

  public getStorageIdForVendorUser(id: any) {
    return `id/${encodeURIComponent(id)}`;
  }
}

export { OAuthEngine, IOAuthConfig };
