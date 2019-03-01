import { request } from '@5qtrs/request';

// ------------------
// Internal Constants
// ------------------

const loginDataKey = 'google-login-data';

// -------------------
// Internal Interfaces
// -------------------

interface ILoginData {
  accessToken: string;
  name: string;
  email: string;
  imageUrl: string;
}

// ------------------
// Internal Functions
// ------------------

function saveLoginData(loginData: ILoginData) {
  localStorage.setItem(loginDataKey, JSON.stringify(loginData));
}

function restoreLoginData() {
  const loginData = localStorage.getItem(loginDataKey);
  if (loginData) {
    return JSON.parse(loginData) as ILoginData;
  }
  return undefined;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IAuthGoogleOptions {
  clientId: string;
  salesAnchorApiUrl: string;
}

// ----------------
// Exported Classes
// ----------------

export class AuthGoogle {
  private clientIdProp: string;
  private salesAnchorApiUrl: string;
  private loginData?: ILoginData;

  constructor(options: IAuthGoogleOptions) {
    this.clientIdProp = options.clientId;
    this.salesAnchorApiUrl = options.salesAnchorApiUrl;
    // this.loginData = restoreLoginData();
  }

  public get isLoggedIn() {
    return this.loginData !== undefined;
  }

  public get name() {
    return this.loginData ? this.loginData.name : '';
  }

  public get email() {
    return this.loginData ? this.loginData.email : '';
  }

  public get imageUrl() {
    return this.loginData ? this.loginData.imageUrl : '';
  }

  public get accessToken() {
    return this.loginData ? this.loginData.accessToken : '';
  }

  public get clientId() {
    return this.clientIdProp;
  }

  public async login(profile: any, idToken: string) {
    const options = {
      method: 'POST',
      url: `${this.salesAnchorApiUrl}/login`,
      data: { idToken, provider: 'google' },
    };
    const response = await request(options);
    if (response.status === 200 && response.data) {
      this.loginData = {
        accessToken: response.data.accessToken,
        name: profile.name,
        email: profile.email,
        imageUrl: profile.imageUrl,
      };
      // saveLoginData(this.loginData);
    }
  }
}
