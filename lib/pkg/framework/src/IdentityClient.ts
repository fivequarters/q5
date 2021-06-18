import superagent from 'superagent';
import { ObjectEntries } from './Utilities';
import { IOAuthToken } from '@fusebit-int/pkg-oauth-connector/libc/OAuthTypes';

const removeLeadingSlash = (s: string) => s.replace(/^\/(.+)$/, '$1');
const removeTrailingSlash = (s: string) => s.replace(/^(.+)\/$/, '$1');

interface Params {
  subscriptionId: string;
  accountId: string;
  baseUrl: string;
  entityId: string;
  accessToken: string;
  [key: string]: string | number | undefined;
}

class IdentityClient {
  private readonly params: any;
  private readonly baseUrl: string;
  private readonly connectorUrl: string;
  private readonly functionUrl: URL;
  private readonly accessToken: string;
  private readonly connectorId: string;

  constructor(params: Params) {
    this.params = params;
    this.functionUrl = new URL(params.baseUrl);
    this.connectorId = params.entityId;
    this.connectorUrl = `${this.functionUrl.protocol}//${this.functionUrl.host}/v2/account/${params.accountId}/subscription/${params.subscriptionId}/connector/${this.connectorId}`;
    this.baseUrl = `${this.connectorUrl}/identity`;
    this.accessToken = params.accessToken;
  }

  private cleanId = (id?: string) => {
    return id ? removeTrailingSlash(removeLeadingSlash(id)) : '';
  };

  private getUrl = (identityId: string) => {
    identityId = this.cleanId(identityId);
    return `${this.baseUrl}/${identityId}`;
  };

  public get = async (identityId?: string) => {
    identityId = this.cleanId(identityId);
    if (!identityId) {
      return undefined;
    }

    const response = await superagent
      .get(this.getUrl(identityId))
      .set('Authorization', `Bearer ${this.accessToken}`)
      .ok((res) => res.status < 300 || res.status === 404);
    return response.status === 404 ? undefined : response.body.data;
  };

  public saveTokenToSession = async (token: IOAuthToken, sessionId: string) => {
    sessionId = this.cleanId(sessionId);
    const response = await superagent
      .put(`${this.connectorUrl}/session/${sessionId}`)
      .set('Authorization', `Bearer ${this.accessToken}`)
      .send({ token, identityId: sessionId });
    return response.body;
  };

  public delete = async (identityId: string) => {
    identityId = this.cleanId(identityId);
    await superagent
      .delete(this.getUrl(identityId))
      .set('Authorization', `Bearer ${this.accessToken}`)
      .ok((res) => res.status === 404 || res.status === 204);
    return;
  };

  public list = async (query: { count?: number; next?: string; idPrefix?: string } = {}) => {
    ObjectEntries(query).forEach((entry) => {
      if (entry[1] === undefined) {
        delete query[entry[0]];
      }
    });
    const response = await superagent.get(this.baseUrl).query(query).set('Authorization', `Bearer ${this.accessToken}`);
    return response.body;
  };

  public getCallbackUrl = async (sessionId: string): Promise<string> => {
    return `${this.connectorUrl}/session/${sessionId}/callback`;
  };
}

export default IdentityClient;
