import superagent from 'superagent';
import FusebitRouter, { Context, Next, IStorage } from '@fusebit-int/pkg-manager';

import { Sdk, IOAuthConfig } from './Common';

class OAuthEngine {
  public cfg: IOAuthConfig;
  public storage: IStorage;
  public router: FusebitRouter;

  constructor(cfg: IOAuthConfig, storage: IStorage, router: FusebitRouter) {
    this.cfg = cfg;
    this.storage = storage;
    this.router = router;

    router.on('uninstall', async (ctx: any, next: Next) => {
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
    return [
      this.cfg.authorizationUrl,
      `?response_type=code`,
      `&scope=${encodeURIComponent(this.cfg.scope)}`,
      `&state=${state}`,
      `&clientId=${this.cfg.clientId}`,
      `&redirect_uri=${encodeURIComponent(`${this.cfg.mountUrl}/callback`)}`,
      this.cfg.audience ? `&audience=${encodeURIComponent(this.cfg.audience)}` : undefined,
      this.cfg.extraParams ? `&${this.cfg.extraParams}` : undefined,
    ].join('');
  }

  /**
   * Convert the successful callback into a token via getAccessToken.
   */
  public async convertAccessCodeToToken(state: string, code: string) {
    /* XXX Probably need to convert the state into the id; look up the session? */
    const token = await this.getAccessToken(code, `${this.cfg.mountUrl}/callback`);
    if (!isNaN(token.expires_in)) {
      token.expires_at = Date.now() + +token.expires_in * 1000;
    }

    token.status = 'authenticated';
    token.timestamp = Date.now();

    this.storage.put(state, token);

    return token;
  }

  /**
   * Exchanges the OAuth authorization code for the access and refresh tokens.
   * @param {string} authorizationCode The authorization_code supplied to the OAuth callback upon successful
   *                                   authorization flow.
   * @param {string} redirectUri The redirect_uri value Fusebit used to start the authorization flow.
   */
  public async getAccessToken(authorizationCode: string, redirectUri: any) {
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
  public async refreshAccessToken(token: any) {
    console.log(`refreshAccessToken ${this.cfg.tokenUrl}`);
    const currentRefreshToken = token.refresh_token;
    const response = await superagent
      .post(this.cfg.tokenUrl)
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        clientId: this.cfg.clientId,
        clientSecret: this.cfg.clientSecret,
        redirect_uri: `${this.cfg.mountUrl}/callback`,
      });
    if (!response.body.refresh_token) {
      response.body.refresh_token = currentRefreshToken;
    }
    return response.body;
  }

  /**
   * Gets the user context representing the user with vendorUserId id. Returned object contains vendorToken
   * and vendorUserProfile properties.
   * @param {string} vendorUserId The vendor user id
   */
  public async getUser(vendorUserId: any) {
    const s = await this.storage.get(this.getStorageIdForVendorUser(vendorUserId));
    return s ? s.data : undefined;
  }

  /**
   * Returns a valid access token to the vendor's system representing the vendor's user described by the userContext.
   * For the vendor's system, if the currently stored access token is expired or nearing expiry, and a refresh
   * token is available, a new access token is obtained, stored for future use, and returned. If a current
   * access token cannot be returned, an exception is thrown.
   * @param {*} userContext The vendor user context
   */
  public async ensureAccessToken(lookupKey: string) {
    let token = await this.storage.get(lookupKey);

    const ensureLocalAccessToken = async () => {
      if (
        token.access_token &&
        (token.expires_at === undefined || token.expires_at > Date.now() + this.cfg.accessTokenExpirationBuffer)
      ) {
        return token;
      }

      if (token.refresh_token) {
        token.status = 'refreshing';
        try {
          await this.storage.put(lookupKey, token);
          token = await this.refreshAccessToken(token);
          if (!isNaN(token.expires_in)) {
            token.expires_at = Date.now() + +token.expires_in * 1000;
          }
          token.status = 'authenticated';
          token.refreshErrorCount = 0;
          await this.storage.put(lookupKey, token);
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
            await this.storage.put(lookupKey, token);
            throw new Error(
              `Error refreshing access token, attempt ${token.refreshErrorCount} out of ${this.cfg.refreshErrorLimit}: ${e.message}`
            );
          }
        }
      }
      // Access token expired, but no refresh token; deleting.
      await this.storage.delete(lookupKey);
      throw new Error(`Access token is expired and cannot be refreshed because the refresh token is not present.`);
    };

    const waitForRefreshedAccessToken = async (count: any, backoff: any) => {
      if (count <= 0) {
        throw new Error(
          `Error refreshing access token. Waiting for the access token to be refreshed exceeded the maximum time`
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(async () => {
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
            result = await waitForRefreshedAccessToken(
              count - 1,
              Math.floor(backoff * this.cfg.refreshBackoffIncrement)
            );
          } catch (e) {
            return reject(e);
          }
          return resolve(result);
        }, backoff);
      });
    };

    if (token.status === 'refreshing') {
      // Wait for the currently ongoing refresh operation in a different instance to finish
      return waitForRefreshedAccessToken(this.cfg.refreshWaitCountLimit, this.cfg.refreshInitialBackoff);
    } else {
      // Get access token for "this" OAuth connector
      return ensureLocalAccessToken();
    }
  }

  public getStorageIdForVendorUser(id: any) {
    return `id/${encodeURIComponent(id)}`;
  }
}

export { OAuthEngine, IOAuthConfig };
