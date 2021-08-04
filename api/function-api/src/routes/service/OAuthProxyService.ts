import * as superagent from 'superagent';

import { v4 as uuidv4 } from 'uuid';
import http_error from 'http-errors';

import * as Constants from '@5qtrs/constants';
import RDS, { Model } from '@5qtrs/db';

/*
 * This implements a simple OAuth proxy suitable for sharing a client_id and client_secret across a set of
 * untrusted peers. It largely leaves the messages alone, except for substituting in client_id and
 * client_secrets when necessary, and replacing issued refresh_tokens with artifical values to allow for
 * refresh_token revocation by individual connectors.
 *
 * Security is managed through contextually requiring the client_id, client_secret, and redirect_uri as
 * specified or determined by the connector identified by the request url.
 */

// The length of time to store the ephemeral 'code' used during the initial authorization.
const DEFAULT_OAUTH_CODE_TTL = 60 * 60 * 1000; // 1 hr

// Declare a general interface to support future specialization, if a specific OAuth server needs
// specialization.
export interface IOAuthProxyService {
  createPeerCallbackUrl: (query: Record<string, string>) => string;
  validatePeerCallbackUrl: (url: string) => void;
  validateSessionId: (sessionId: string) => Promise<void>;
  validateClientId: (peerId: string) => Promise<void>;
  validateSecuredRequest: (peerId: string, peerSecret: string) => Promise<void>;
  getAuthorizeUrl: (query: Record<string, string>) => string;
  doPeerCallback: (code: string) => Promise<void>;
  doTokenRequest: (reqBody: Record<string, string>, code: string) => Promise<superagent.Response>;
  doTokenRevocation: (body: Record<string, string>) => Promise<void>;
  loadCode: (peerId: string, peerSecret: string, code: string) => Promise<string>;
}

export interface IOAuthProxyConfiguration {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  revokeUrl: string;
}

// Base class to overload or use directly if behaviors are normal for targetted services.
export class OAuthProxyService implements IOAuthProxyService {
  public accountId: string;
  public subscriptionId: string;
  public connectorId: string;
  public name: string;

  public configuration: IOAuthProxyConfiguration;

  constructor(
    accountId: string,
    subscriptionId: string,
    connectorId: string,
    name: string,
    configuration: IOAuthProxyConfiguration
  ) {
    this.accountId = accountId;
    this.subscriptionId = subscriptionId;
    this.connectorId = connectorId;
    this.name = name;
    this.configuration = configuration;
  }

  // Some utility methods; these will have to change if the connector contract changes, for example.
  public getBasePath = (): string =>
    `/v2/account/${this.accountId}/subscription/${this.subscriptionId}/connector/${this.connectorId}`;
  public getPeerCallbackPath = (): string => `${this.getBasePath()}/api/callback`;
  public getProxyCallbackPath = (): string => `${this.getBasePath()}/proxy/${this.name}/oauth/callback`;

  public getAuthorizeUrl = (query: Record<string, string>) => {
    const url = new URL(this.configuration.authorizationUrl);
    Object.entries(query).forEach(([key, value]: [string, unknown]) => {
      if (typeof value !== 'string') {
        throw http_error(400, `Invalid parameter ${key}`);
      }

      url.searchParams.append(key, value);
    });

    // Overload with the internal parameters
    url.searchParams.set('client_id', this.configuration.clientId);
    url.searchParams.set('redirect_uri', process.env.API_SERVER + this.getProxyCallbackPath());

    return url.toString();
  };

  public createPeerCallbackUrl = (query: Record<string, string>): string => {
    const url = new URL(process.env.API_SERVER + this.getPeerCallbackPath());

    Object.entries(query).forEach(([key, value]: [string, unknown]) => url.searchParams.append(key, value as string));

    return url.toString();
  };

  // Called on /callback, saves the code so that this peer can access it later.
  public doPeerCallback = async (code: string) => {
    const peerIdentity = await this.getIdentity();
    await this.saveCode(peerIdentity.peerId, peerIdentity.peerSecret, code, code, DEFAULT_OAUTH_CODE_TTL);
  };

  // Called on /token, converts the client_id and secret to the correct credentials and masks the
  // refresh_token so that it's unique per authentication pass.
  public doTokenRequest = async (reqBody: Record<string, string>, code: string): Promise<superagent.Response> => {
    const body: Record<string, string> = {
      ...reqBody,
      client_id: this.configuration.clientId,
      client_secret: this.configuration.clientSecret,
    };

    if (body.code) {
      body.code = code;
    } else if (body.refresh_token) {
      body.refresh_token = code;
    } else {
      throw http_error(400, 'missing token');
    }

    // Perform the request with the new id, secret, and refresh_token
    const response = await superagent
      .post(this.configuration.tokenUrl)
      .type('form')
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
  };

  // Retrieve the configuration for the connector this proxy is mounted under.
  public getIdentity = async (): Promise<{ peerId: string; peerSecret: string }> => {
    const connector = await RDS.DAO.connector.getEntity({
      accountId: this.accountId,
      subscriptionId: this.subscriptionId,
      id: this.connectorId,
    });
    return { peerId: connector.data.configuration.clientId, peerSecret: connector.data.configuration.clientSecret };
  };

  // Either revoke a refresh_token by removing it from storage, thus preventing it from translating to a
  // mapped refresh_token, or send the request to the end server directly if it's an access_token (which isn't
  // proxied) to be revoked, or not, as it determines.
  public doTokenRevocation = async (body: Record<string, string>): Promise<void> => {
    try {
      const peerIdentity = await this.getIdentity();

      if (peerIdentity.peerId !== body.client_id) {
        // Invalid request, silently drop.
        return;
      }

      if (body.token_type_hint === 'refresh_token') {
        await this.deleteCode(peerIdentity.peerId, peerIdentity.peerSecret, body.token);
      } else {
        // Assuming it's a client_id-based-authentication on revocation, replace.
        body.client_id = this.configuration.clientId;

        // Attempt a revocation
        await superagent
          .post(this.configuration.revokeUrl)
          .type('form')
          .send(body)
          .ok(() => true);
      }
    } catch (error) {
      // Drop all errors.
    }
  };

  public validatePeerCallbackUrl = (url: string): void => {
    const validUrl = `${Constants.API_PUBLIC_ENDPOINT}${this.getPeerCallbackPath()}`;
    if (url !== validUrl) {
      throw http_error(403);
    }
  };

  public validateSessionId = async (sessionId: string): Promise<void> => {
    // See if there's an active session matching `state` under this connector.
    await RDS.DAO.session.getEntity({
      accountId: this.accountId,
      subscriptionId: this.subscriptionId,
      id: Model.createSubordinateId(Model.EntityType.connector, this.connectorId, sessionId),
    });
  };

  public validateClientId = async (peerId: string): Promise<void> => {
    // Get configuration of connector
    const peerIdentity = await this.getIdentity();

    // Compare passed-in peerId with clientId from configuration
    if (peerIdentity.peerId !== peerId) {
      throw http_error(403);
    }
  };

  public validateSecuredRequest = async (peerId: string, peerSecret: string): Promise<void> => {
    // Get configuration of connector
    const peerIdentity = await this.getIdentity();

    // Compare passed-in peerId with clientId from configuration
    if (peerIdentity.peerId !== peerId || peerIdentity.peerSecret !== peerSecret) {
      throw http_error(403);
    }
  };

  // Save the values to storage, returning the value for convienence.
  public saveCode = async (
    peerId: string,
    peerSecret: string,
    code: string,
    value: string,
    ttl?: number
  ): Promise<string> => {
    await RDS.DAO.storage.createEntity({
      accountId: this.accountId,
      subscriptionId: this.subscriptionId,
      id: `/proxy/${this.name}/${peerId}/${peerSecret}/${code}`,
      data: value,
      ...(ttl ? { expires: new Date(Date.now() + ttl).toISOString() } : {}),
    });

    // Return the code, which will be the new uuidv4() if it's a refresh_token, or unchanged if it's a normal
    // authorization code.
    return code;
  };

  // Load from storage
  public loadCode = async (peerId: string, peerSecret: string, code: string) => {
    const entity = await RDS.DAO.storage.getEntity({
      accountId: this.accountId,
      subscriptionId: this.subscriptionId,
      id: `/proxy/${this.name}/${peerId}/${peerSecret}/${code}`,
    });

    return entity.data;
  };

  // Attempt to remove the value from storage; generate no errors on failure.
  public deleteCode = async (peerId: string, peerSecret: string, code: string): Promise<void> => {
    try {
      await RDS.DAO.storage.deleteEntity({
        accountId: this.accountId,
        subscriptionId: this.subscriptionId,
        id: `/proxy/${this.name}/${peerId}/${peerSecret}/${code}`,
      });
    } catch (e) {
      // Never throw exceptions from here; delete always succeeds according to spec.
    }
  };
}
