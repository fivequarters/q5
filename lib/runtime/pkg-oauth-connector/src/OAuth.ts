import superagent from 'superagent';
import FusebitRouter, { Context, Next } from '@fusebit-int/pkg-manager';

import { Sdk, IOAuthConfig, IStorage } from './Common';

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

  /**
   * Obtains the user profile given a freshly completed authorization flow. User profile will be stored along the token
   * context.
   * @param {*} tokenContext An object representing the result of the getAccessToken call. It contains access_token.
   *
   * XXX EVENT?
   */
  public async getUserProfile(tokenContext: any) {
    return {};
  }

  /**
   * Returns a string uniquely identifying the user in vendor's system. Typically this is a property of
   * userContext.vendorUserProfile. Default implementation is opportunistically returning
   * userContext.vendorUserProfile.id if it exists.
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and
   * vendorUserProfile, representing responses from getAccessToken and getUserProfile, respectively.
   *
   * XXX EVENT?
   */
  public async getUserId(userContext: any) {
    if (userContext.vendorUserProfile.id) {
      return userContext.vendorUserProfile.id;
    }
    throw new Error(
      'Please implement the getUserProfile and getUserId methods in the class deriving from OAuthConnector.'
    );
  }

  /**
   * Creates the fully formed web authorization URL to start the authorization flow.
   * @param {FusebitContext} ctx The Fusebit context of the request
   * @param {string} state The value of the OAuth state parameter.
   * @param {string} redirectUri The callback URL to redirect to after the authorization flow.
   */
  public async getAuthorizationUrl(state: any, redirectUri: any) {
    return [
      this.cfg.authorizationUrl,
      `?response_type=code`,
      `&scope=${encodeURIComponent(this.cfg.scope)}`,
      `&state=${state}`,
      `&clientId=${this.cfg.clientId}`,
      `&redirect_uri=${encodeURIComponent(redirectUri)}`,
      this.cfg.audience ? `&audience=${encodeURIComponent(this.cfg.audience)}` : undefined,
      this.cfg.extraParams ? `&${this.cfg.extraParams}` : undefined,
    ].join('');
  }

  /**
   * Exchanges the OAuth authorization code for the access and refresh tokens.
   * @param {FusebitContext} ctx The Fusebit context of the request
   * @param {string} authorizationCode The authorization_code supplied to the OAuth callback upon successful
   *                                   authorization flow.
   * @param {string} redirectUri The redirect_uri value Fusebit used to start the authorization flow.
   */
  public async getAccessToken(ctx: any, authorizationCode: any, redirectUri: any) {
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
   * @param {FusebitContext} ctx The Fusebit context of the request
   * @param {*} tokenContext An object representing the result of the getAccessToken call. It contains refresh_token.
   * @param {string} redirectUri The redirect_uri value Fusebit used to start the authorization flow.
   */
  public async refreshAccessToken(ctx: any, tokenContext: any, redirectUri: any) {
    const currentRefreshToken = tokenContext.refresh_token;
    const response = await superagent
      .post(this.cfg.tokenUrl)
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: tokenContext.refresh_token,
        clientId: this.cfg.clientId,
        clientSecret: this.cfg.clientSecret,
        redirect_uri: redirectUri || `${ctx.baseUrl}/callback`,
      });
    if (!response.body.refresh_token) {
      response.body.refresh_token = currentRefreshToken;
    }
    return response.body;
  }

  /**
   * Gets the user context representing the user with vendorUserId id. Returned object contains vendorToken
   * and vendorUserProfile properties.
   * @param {FusebitContext} ctx The Fusebit context
   * @param {string} vendorUserId The vendor user id
   */
  public async getUser(ctx: any, vendorUserId: any) {
    const s = await this.storage.get(this.getStorageIdForVendorUser(vendorUserId));
    return s ? s.data : undefined;
  }

  /**
   * Saves user context in storage for future use.
   * @param {FusebitContext} ctx The Fusebit context of the request
   * @param {*} userContext The user context representing the vendor's user. Contains vendorToken and
   * vendorUserProfile, representing responses from getAccessToken and getUserProfile, respectively.
   */
  public async saveUser(ctx: any, userContext: any) {
    return this.storage.put({ data: userContext }, this.getStorageIdForVendorUser(userContext.vendorUserId));
  }

  /**
   * Deletes user context from storage.
   * @param {FusebitContext} ctx The Fusebit context
   * @param {string} vendorUserId The vendor user id
   */
  public async deleteUser(ctx: any, vendorUserId: any) {
    const userContext = await this.getUser(ctx, vendorUserId);
    return userContext && this.storage.delete(this.getStorageIdForVendorUser(userContext.vendorUserId));
  }

  /**
   * Returns a valid access token to the vendor's system representing the vendor's user described by the userContext.
   * For the vendor's system, if the currently stored access token is expired or nearing expiry, and a refresh
   * token is available, a new access token is obtained, stored for future use, and returned. If a current
   * access token cannot be returned, an exception is thrown.
   * @param {FusebitContext} ctx The Fusebit context of the request
   * @param {*} userContext The vendor user context
   */
  public async ensureAccessToken(ctx: any, userContext: any) {
    const ensureLocalAccessToken = async () => {
      if (
        userContext.vendorToken.access_token &&
        (userContext.vendorToken.expires_at === undefined ||
          userContext.vendorToken.expires_at > Date.now() + this.cfg.accessTokenExpirationBuffer)
      ) {
        Sdk.debug('RETURNING CURRENT ACCESS TOKEN FOR USER', userContext.vendorUserId);
        return userContext.vendorToken;
      }
      if (userContext.vendorToken.refresh_token) {
        Sdk.debug('REFRESHING ACCESS TOKEN FOR USER', userContext.vendorUserId);
        userContext.status = 'refreshing';
        try {
          await this.saveUser(ctx, userContext);
          userContext.vendorToken = await this.refreshAccessToken(
            ctx,
            userContext.vendorToken,
            `${ctx.baseUrl}/callback`
          );
          if (!isNaN(userContext.vendorToken.expires_in)) {
            userContext.vendorToken.expires_at = Date.now() + +userContext.vendorToken.expires_in * 1000;
          }
          userContext.vendorUserProfile = await this.getUserProfile(userContext.vendorToken);
          userContext.status = 'authenticated';
          userContext.refreshErrorCount = 0;
          await this.saveUser(ctx, userContext);
          return userContext.vendorToken;
        } catch (e) {
          if (userContext.refreshErrorCount > this.cfg.refreshErrorLimit) {
            Sdk.debug('REFRESH TOKEN ERROR, DELETING USER', e);
            await this.deleteUser(ctx, userContext.vendorUserId);
            throw new Error(
              `Error refreshing access token. Maximum number of attempts exceeded, user has been deleted: ${e.message}`
            );
          } else {
            userContext.refreshErrorCount = (userContext.refreshErrorCount || 0) + 1;
            userContext.status = 'refresh_error';
            await this.saveUser(ctx, userContext);
            throw new Error(
              `Error refreshing access token, attempt ${userContext.refreshErrorCount} out of ${this.cfg.refreshErrorLimit}: ${e.message}`
            );
          }
        }
      }
      Sdk.debug('REFRESH TOKEN ERROR: ACCESS TOKEN EXPIRED BUT REFRESH TOKEN ABSENT, DELETING USER');
      await this.deleteUser(ctx, userContext.vendorUserId);
      throw new Error(`Access token is expired and cannot be refreshed because the refresh token is not present.`);
    };

    const waitForRefreshedAccessToken = async (count: any, backoff: any) => {
      Sdk.debug('WAITING FOR ACCESS TOKEN TO BE REFRESHED FOR USER', userContext.vendorUserId, 'ATTEMPTS LEFT', count);
      if (count <= 0) {
        throw new Error(
          `Error refreshing access token. Waiting for the access token to be refreshed exceeded the maximum time`
        );
      }
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            userContext = await this.getUser(ctx, userContext.vendorUserId);
            if (!userContext || userContext.status === 'refresh_error') {
              throw new Error(`Concurrent access token refresh operation failed`);
            }
          } catch (e) {
            return reject(new Error(`Error waiting for access token refresh: ${e.message}`));
          }
          if (userContext.status === 'authenticated') {
            return resolve(userContext.vendorToken);
          } else {
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
          }
        }, backoff);
      });
    };

    if (userContext.status === 'refreshing') {
      // Wait for the currently ongoing refresh operation to finish
      return waitForRefreshedAccessToken(this.cfg.refreshWaitCountLimit, this.cfg.refreshInitialBackoff);
    } else {
      // Get access token for "this" OAuth connector
      return ensureLocalAccessToken();
    }
  }

  public getStorageIdForVendorUser(id: any) {
    return `vendor-user/${encodeURIComponent(id)}`;
  }
}

export { OAuthEngine, IOAuthConfig };
