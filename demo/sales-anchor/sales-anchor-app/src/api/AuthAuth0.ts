import { WebAuth } from 'auth0-js';

// ------------------
// Internal Constants
// ------------------

const loginDataKey = 'auth0-login-data';

// -------------------
// Internal Interfaces
// -------------------

interface ILoginData {
  accessToken: string;
  name: string;
  email: string;
  imageUrl: string;
  editorAccessToken: string;
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

export interface IAuthAuth0Options {
  clientId: string;
  salesAnchorDomain: string;
  salesAnchorAudience: string;
  fiveQuartersAudience: string;
  redirectUri: string;
}

// ----------------
// Exported Classes
// ----------------

export class AuthAuth0 {
  private loginData?: ILoginData;
  private salesAnchorWebAuth: WebAuth;
  private fiveQuartersWebAuth: WebAuth;

  constructor(options: IAuthAuth0Options) {
    this.salesAnchorWebAuth = new WebAuth({
      domain: options.salesAnchorDomain,
      clientID: options.clientId,
      audience: options.salesAnchorAudience,
      redirectUri: options.redirectUri,
      responseType: 'token id_token',
      scope: 'openid profile',
    });
    this.fiveQuartersWebAuth = new WebAuth({
      domain: options.salesAnchorDomain,
      clientID: options.clientId,
      audience: options.fiveQuartersAudience,
      redirectUri: options.redirectUri,
      responseType: 'token',
      scope: 'openid',
    });

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

  public get editorAccessToken() {
    return this.loginData ? this.loginData.editorAccessToken : '';
  }

  public async startLogin() {
    this.salesAnchorWebAuth.authorize();
  }

  public async endLogin() {
    return new Promise((resolve, reject) => {
      this.salesAnchorWebAuth.parseHash((error, decodedHash) => {
        if (error) {
          return reject(error);
        }
        if (decodedHash) {
          this.fiveQuartersWebAuth.checkSession({ prompt: 'none' }, (__, response) => {
            const idTokenPayload = decodedHash.idTokenPayload || {};
            this.loginData = {
              accessToken: decodedHash.accessToken || '',
              name: idTokenPayload.name,
              email: idTokenPayload.email,
              imageUrl: idTokenPayload.picture,
              editorAccessToken: response ? response.accessToken : '',
            };
            saveLoginData(this.loginData);
          });
        }
        resolve();
      });
    });
  }
}
