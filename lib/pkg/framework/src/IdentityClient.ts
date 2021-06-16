import superagent from 'superagent';

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
  private readonly identityIdPrefix: string;
  private readonly baseUrl: string;
  private readonly connectorUrl: string;
  private readonly functionUrl: URL;
  private readonly accessToken: string;

  constructor(params: Params, identityIdPrefix: string) {
    this.params = params;
    this.identityIdPrefix = this.cleanId(identityIdPrefix);
    this.functionUrl = new URL(params.baseUrl);
    this.connectorUrl = `${this.functionUrl.protocol}//${this.functionUrl.host}/v2/account/${params.accountId}/subscription/${params.subscriptionId}/connector/${params.entityId}`;
    this.baseUrl = `${this.connectorUrl}/identity/${this.identityIdPrefix || ''}`;
    this.accessToken = params.accessToken;
  }

  private cleanId = (id?: string) => {
    return id ? removeTrailingSlash(removeLeadingSlash(id)) : '';
  };

  private getUrl = (identitySubId: string) => {
    identitySubId = this.cleanId(identitySubId);
    //TODO: Verify `/` as delimiter.  Url encode?
    return `${this.baseUrl}${identitySubId ? '/' + identitySubId : ''}`;
  };

  public get = async (identitySubId?: string) => {
    identitySubId = this.cleanId(identitySubId);
    if (!identitySubId && !this.identityIdPrefix) {
      return undefined;
    }

    const response = await superagent
      .get(this.getUrl(identitySubId))
      .set('Authorization', `Bearer ${this.accessToken}`)
      .ok((res) => res.status < 300 || res.status === 404);
    return response.status === 404 ? undefined : response.body.data;
  };

  public put = async (data: any, identitySubId?: string) => {
    identitySubId = this.cleanId(identitySubId);
    if (!identitySubId && !this.identityIdPrefix) {
      throw new Error(
        'IdentityClient objects cannot be stored at the root of the hierarchy. Specify a identitySubId when calling the `put` method, or a identityIdPrefix when creating the IdentityClient client.'
      );
    }
    const response = await superagent
      .put(this.getUrl(identitySubId))
      .set('Authorization', `Bearer ${this.accessToken}`)
      .send(data);
    return response.body;
  };

  public delete = async (identitySubId?: string, recursive?: boolean, forceRecursive?: boolean) => {
    identitySubId = identitySubId ? removeLeadingSlash(removeTrailingSlash(identitySubId)) : '';
    if (!identitySubId && !this.identityIdPrefix && !recursive) {
      throw new Error(
        'You are attempting to recursively delete all Identities in this Fusebit subscription. If this is your intent, please pass "true" as the second parameter in the call to delete(identitySubId, recursive).'
      );
    }
    //TODO: Recursive delete missing in v2.  Add it
    await superagent
      .delete(`${this.getUrl(identitySubId)}${recursive ? '/*' : ''}`)
      .set('Authorization', `Bearer ${this.accessToken}`)
      .ok((res) => res.status === 404 || res.status === 204);
    return;
  };

  public list = async (identitySubId: string, queryInput: { count?: number; next?: string } = {}) => {
    const query: { count?: number; next?: string; idPrefix?: string } = { ...queryInput };
    if (query.count === undefined) {
      delete query.count;
    }
    if (query.next === undefined) {
      delete query.next;
    }
    query.idPrefix = this.identityIdPrefix ? `${this.identityIdPrefix}/${identitySubId}` : identitySubId;
    const response = await superagent.get(this.baseUrl).query(query).set('Authorization', `Bearer ${this.accessToken}`);
    return response.body;
  };

  public getCallbackUrl = async (state: string): Promise<string> => {
    const sessionId = state.split('/').pop();
    const sessionUrl = `${this.connectorUrl}/session/${sessionId}`;
    const sessionResponse = await superagent
      .get(sessionUrl)
      .set('Authorization', `Bearer ${this.accessToken}`)
      .ok((res) => res.status === 404 || res.status === 204);
    //TODO: Is this where the callbackurl is being stored?  Not sure with benn's changes
    return sessionResponse.body.callbackUrl;
  };
}

export default IdentityClient;
