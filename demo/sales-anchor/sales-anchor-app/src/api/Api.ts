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

export enum AddonState {
  NotInstalled,
  Installed,
  HasUpdate,
}

export interface AddonItem {
  logoUrl: string;
  name: string;
  description: string;
  version: string;
  state: AddonState;
  secretName: string;
  secretKey: string;
  secretValue: string;
  template?: any;
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
    console.log('GET EDITOR CONFIG', config);
    if (config) {
      config.accessToken = config.token || editorAccessToken;
    }
    return config;
  }

  public getAvailableAddons() {
    return [
      {
        name: 'Clearbit',
        logoUrl: './assets/img/clearbit.png',
        description:
          'Clearbit is the marketing data engine for all of your customer interactions. Deeply understand your customers, identify future prospects, and personalize every single marketing and sales interaction.',
        version: '1.1.0.0',
        state: AddonState.NotInstalled,
        secretName: 'API Key',
        secretKey: 'CLEARBIT_KEY',
        secretValue: '',
        template: {
          nodejs: {
            files: {
              'index.js': `
              const lookupSocial = require('./lookupSocial.js');
    
              module.exports = (ctx, cb) => { 
                  lookupSocial(ctx.body, ctx.configuration, e => cb(e, { body: ctx.body }));
              }`,
              'lookupSocial.js': `
              module.exports = (lead, configuration, cb) => {
                const clearbit_key = ctx.configuration.CLEARBIT_KEY;
                const clearbit = require('clearbit')(clearbit_key);
                var Person = clearbit.Person;
                
                Person.find({email: lead.email}). 
                  then(person => {
                    lead.github = person.github.handle;
                    lead.twitter = person.twitter.handle;
                    lead.linkedin = person.linkedin.handle;
                    cb();
                  });
              }`,
              'package.json': { dependencies: { clearbit: '*' } },
            },
          },
        },
      },
      {
        name: 'Salesforce',
        logoUrl: './assets/img/salesforce.png',
        description:
          'Salesforce is the world’s #1 customer relationship management (CRM) platform. Our cloud-based, CRM applications for sales, service, marketing, and more don’t require IT experts to set up or manage — simply log in and start connecting to customers in a whole new way.',
        version: '3.4.0.0',
        state: AddonState.NotInstalled,
        secretName: 'Client Secret',
        secretKey: 'SALESFORCE_SECRET',
        secretValue: '',
      },
      {
        name: 'Intercom',
        logoUrl: './assets/img/intercom.png',
        description:
          'A new and better way to acquire, engage and retain customers. Modern products for sales, marketing and support to connect with customers and grow faster.',
        version: '1.0.0.0',
        state: AddonState.NotInstalled,
        secretName: 'API Key',
        secretKey: 'INTERCOM_KEY',
        secretValue: '',
      },
      {
        name: 'Slack',
        logoUrl: './assets/img/slack.png',
        description:
          'Slack is a collaboration hub, where the right people and the right information come together, helping everyone get work done.',
        version: '0.5.6.0',
        state: AddonState.NotInstalled,
        secretName: 'API Key',
        secretKey: 'SLACK_KEY',
        secretValue: '',
      },
    ];
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
