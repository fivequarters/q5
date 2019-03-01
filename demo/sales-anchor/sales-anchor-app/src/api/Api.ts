import { IHttpRequest, request } from '@5qtrs/request';
import { AuthAuth0 } from './AuthAuth0';
import { AuthGoogle } from './AuthGoogle';

export interface IApiOptions {
  salesAnchorApiUrl: string;
  googleOptions: {
    clientId: string;
  };
  auth0Options: {
    clientId: string;
    salesAnchorDomain: string;
    salesAnchorAudience: string;
    fiveQuartersAudience: string;
    redirectUri: string;
  };
}

export class Api {
  public get accessToken() {
    return this.authGoogle.accessToken || this.authAuth0.accessToken;
  }

  public get name() {
    return this.authGoogle.name || this.authAuth0.name;
  }

  public get imageUrl() {
    return this.authGoogle.imageUrl || this.authAuth0.imageUrl;
  }

  public get authGoogle() {
    return this.authGoogleProp;
  }

  public get authAuth0() {
    return this.authAuth0Prop;
  }
  private authGoogleProp: AuthGoogle;
  private authAuth0Prop: AuthAuth0;
  private salesAnchorApiUrl: string;

  public constructor(options?: IApiOptions) {
    const salesAnchorApiUrl = options ? options.salesAnchorApiUrl : '';
    const googleclientId = options ? options.googleOptions.clientId : '';
    const auth0clientId = options ? options.auth0Options.clientId : '';
    const salesAnchorDomain = options ? options.auth0Options.salesAnchorDomain : '';
    const salesAnchorAudience = options ? options.auth0Options.salesAnchorAudience : '';
    const fiveQuartersAudience = options ? options.auth0Options.fiveQuartersAudience : '';
    const redirectUri = options ? options.auth0Options.redirectUri : '';

    this.salesAnchorApiUrl = salesAnchorApiUrl;
    this.authGoogleProp = new AuthGoogle({ clientId: googleclientId, salesAnchorApiUrl });
    this.authAuth0Prop = new AuthAuth0({
      clientId: auth0clientId,
      salesAnchorDomain,
      salesAnchorAudience,
      fiveQuartersAudience,
      redirectUri,
    });
  }

  public async getInquiries() {
    return (await this.request('GET', 'inquiries')) || [];
  }

  public async generateInquiry() {
    await this.request('POST', 'inquiries');
  }

  public async getEditorConfig() {
    let url = `editor`;

    // If we authenticated with Auth0, we already generated the
    // editor token on the client via a silent auth request with
    // auth0. If we authenticated directly with Google, we need
    // the backend to mint us an editor access token
    const editorAccessToken = this.authAuth0.editorAccessToken;
    if (!editorAccessToken) {
      url += `?generate-token=true`;
    }
    const config = await this.request('GET', url);

    if (editorAccessToken) {
      config.token = editorAccessToken;
    }
    return config;
  }

  private async request(method: string, path: string, data?: any) {
    const url = `${this.salesAnchorApiUrl}/${path}`;
    const options: IHttpRequest = { method, url };
    if (data) {
      options.data = data;
    }
    if (this.accessToken) {
      options.headers = { authorization: `Bearer ${this.accessToken}` };
    }
    const response = await request(options);
    if (response.status !== 200) {
      return undefined;
    }

    return response.data;
  }
}
