import superagent from 'superagent';
import { Router, ICtxWithState, Next } from '@fusebit-int/framework';

import { IOAuthConfig, IOAuthToken } from './OAuthTypes';

import { callbackSuffixUrl } from './OAuthConstants';

class OAuthEngine {
  public cfg: IOAuthConfig;
  public router: Router;

  constructor(cfg: IOAuthConfig, router: Router) {
    this.cfg = cfg;
    this.router = router;

    router.on('uninstall', async (ctx: ICtxWithState, next: Next) => {
      return next();
    });
  }

  public setMountUrl(mountUrl: string) {
    this.cfg.mountUrl = mountUrl;
  }

  public async deleteUser(ctx: ICtxWithState, lookupKey: string) {
    return ctx.state.identityClient?.delete(lookupKey);
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
      client_id: this.cfg.clientId,
      redirect_uri: this.cfg.mountUrl + callbackSuffixUrl,
    });

    if (this.cfg.audience) {
      params.append('audience', this.cfg.audience);
    }

    return `${this.cfg.authorizationUrl}?${params.toString()}${this.cfg.extraParams ? `&${this.cfg.extraParams}` : ''}`;
  }

  /**
   * Convert the successful callback into a token via getAccessToken.
   */
  public async convertAccessCodeToToken(ctx: ICtxWithState, lookupKey: string, code: string) {
    const token = await this.getAccessToken(code, this.cfg.mountUrl + callbackSuffixUrl);
    if (!isNaN(token.expires_in)) {
      token.expires_at = Date.now() + +token.expires_in * 1000;
    }

    token.status = 'authenticated';
    token.timestamp = Date.now();

    await ctx.state.identityClient?.saveTokenToSession(token, lookupKey);

    return token;
  }

  /**
   * Fetches callback url from session that is managing the connector
   */
  public async redirectToCallback(ctx: ICtxWithState) {
    const callbackUrl = await ctx.state.identityClient!.getCallbackUrl(ctx.query.state);
    ctx.redirect(callbackUrl);
  }

  /**
   * Exchanges the OAuth authorization code for the access and refresh tokens.
   * @param {string} authorizationCode The authorization_code supplied to the OAuth callback upon successful
   *                                   authorization flow.
   * @param {string} redirectUri The redirect_uri value Fusebit used to start the authorization flow.
   */
  public async getAccessToken(authorizationCode: string, redirectUri: string): Promise<IOAuthToken> {
    const params = {
      grant_type: 'authorization_code',
      code: authorizationCode,
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
      redirect_uri: redirectUri,
    };
    const response = await superagent.post(this.cfg.tokenUrl).type('form').send(params);

    return response.body;
  }

  /**
   * Obtains a new access token using refresh token.
   * @param {*} token An object representing the result of the getAccessToken call. It contains refresh_token.
   * @param {string} redirectUri The redirect_uri value Fusebit used to start the authorization flow.
   */
  public async refreshAccessToken(refreshToken: string) {
    const params = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.cfg.clientId,
      client_secret: this.cfg.clientSecret,
      redirect_uri: `${this.cfg.mountUrl}${callbackSuffixUrl}`,
    };

    const response = await superagent.post(this.cfg.tokenUrl).type('form').send(params);

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
  public async ensureAccessToken(ctx: ICtxWithState, lookupKey: string, identity: boolean = true) {
    let token: IOAuthToken | undefined;
    const tokenRw = identity
      ? {
          get: ctx.state.identityClient!.getToken,
          put: ctx.state.identityClient!.updateToken,
          delete: ctx.state.identityClient!.delete,
        }
      : {
          get: ctx.state.identityClient!.loadTokenFromSession,
          put: ctx.state.identityClient!.saveTokenToSession,
          delete: () => {},
        };

    try {
      token = await tokenRw.get(lookupKey);
    } catch (e) {
      throw e;
    }

    if (!token) {
      return undefined;
    }

    if (token.status === 'refreshing') {
      // Wait for the currently ongoing refresh operation in a different instance to finish
      return this.waitForRefreshedAccessToken(
        ctx,
        lookupKey,
        this.cfg.refreshWaitCountLimit,
        this.cfg.refreshInitialBackoff,
        tokenRw
      );
    } else {
      // Get access token for "this" OAuth connector
      return this.ensureLocalAccessToken(ctx, lookupKey, tokenRw);
    }
  }

  protected async ensureLocalAccessToken(ctx: ICtxWithState, lookupKey: string, tokenRw: any) {
    let token: IOAuthToken = await tokenRw.get(lookupKey);
    if (
      token.access_token &&
      (token.expires_at === undefined || token.expires_at > Date.now() + this.cfg.accessTokenExpirationBuffer)
    ) {
      return token;
    }
    if (token.refresh_token) {
      token.status = 'refreshing';
      try {
        await tokenRw.put(token, lookupKey);

        token = await this.refreshAccessToken(token.refresh_token);

        if (!isNaN(token.expires_in)) {
          token.expires_at = Date.now() + +token.expires_in * 1000;
        }

        token.status = 'authenticated';
        token.refreshErrorCount = 0;

        await tokenRw.put(token, lookupKey);

        return token;
      } catch (e) {
        if (token.refreshErrorCount > this.cfg.refreshErrorLimit) {
          await ctx.state.identityClient?.delete(lookupKey);
          throw new Error(
            `Error refreshing access token. Maximum number of attempts exceeded, identity ${lookupKey} has been deleted: ${e.message}`
          );
        } else {
          token.refreshErrorCount = (token.refreshErrorCount || 0) + 1;
          token.status = 'refresh_error';
          await tokenRw.put(token, lookupKey);
          throw new Error(
            `Error refreshing access token, attempt ${token.refreshErrorCount} out of ${this.cfg.refreshErrorLimit}: ${e.message}`
          );
        }
      }
    }

    // Access token expired, but no refresh token; deleting.
    await tokenRw.delete(lookupKey);
    throw new Error(`Access token is expired and cannot be refreshed because the refresh token is not present.`);
  }

  protected async waitForRefreshedAccessToken(
    ctx: ICtxWithState,
    lookupKey: string,
    count: number,
    backoff: number,
    tokenRw: any
  ) {
    if (count <= 0) {
      throw new Error(
        `Error refreshing access token. Waiting for the access token to be refreshed exceeded the maximum time`
      );
    }

    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        let token: IOAuthToken;
        try {
          token = await tokenRw.get(lookupKey);
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
            ctx,
            lookupKey,
            count - 1,
            Math.floor(backoff * this.cfg.refreshBackoffIncrement),
            tokenRw
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
