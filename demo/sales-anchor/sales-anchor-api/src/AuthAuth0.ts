import { verifyJwt } from '@5qtrs/jwt';
import { ApiConfig } from './ApiConfig';

// ----------------
// Exported Classes
// ----------------

export class AuthAuth0 {
  private issuer: string;
  private audience: string;
  private jwks: string;

  constructor(config: ApiConfig) {
    this.issuer = config.auth0Issuer;
    this.audience = config.salesAnchorAudience;
    this.jwks = config.auth0Jwks;
  }

  public async verifyAccessToken(accessToken: string) {
    let decoded;
    try {
      decoded = await verifyJwt(accessToken, this.jwks, {
        audience: this.audience,
        issuer: this.issuer,
      });
    } catch (error) {
      // do nothing
    }

    return decoded;
  }
}
