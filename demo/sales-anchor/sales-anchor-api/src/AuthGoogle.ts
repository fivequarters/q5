import { signJwt, verifyJwt } from '@5qtrs/jwt';
import { createKeyPair } from '@5qtrs/key-pair';
import { ApiConfig } from './ApiConfig';

// ----------------
// Exported Classes
// ----------------

export class AuthGoogle {
  private issuer: string;
  private audience: string;
  private certsUrl: string;
  private selfIssuer: string;
  private selfAudience: string;
  private keyPair?: { publicKey: string; privateKey: string };

  constructor(config: ApiConfig) {
    this.issuer = config.googleIssuer;
    this.audience = config.googleAudience;
    this.certsUrl = config.googleCertsUrl;
    this.selfIssuer = config.salesAnchorIssuer;
    this.selfAudience = config.salesAnchorAudience;
  }

  public async createAccessToken(idToken: string) {
    const decoded = await verifyJwt(idToken, this.certsUrl, {
      issuer: this.issuer,
      audience: this.audience,
    });

    const keyPair = await this.getKeyPair();
    return signJwt(
      {
        aud: this.selfAudience,
        iss: this.selfIssuer,
        sub: decoded.sub,
      },
      keyPair.privateKey,
      { expiresIn: '1h', algorithm: 'RS256' }
    );
  }

  public async verifyAccessToken(accessToken: string) {
    const keyPair = await this.getKeyPair();
    let decoded;
    try {
      decoded = await verifyJwt(accessToken, keyPair.publicKey, {
        audience: this.selfAudience,
        issuer: this.selfIssuer,
      });
    } catch (error) {
      // do nothing
    }

    return decoded;
  }

  private async getKeyPair() {
    if (!this.keyPair) {
      this.keyPair = await createKeyPair();
    }
    return this.keyPair;
  }
}
