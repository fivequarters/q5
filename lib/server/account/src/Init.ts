import { random } from '@5qtrs/random';
import { signJwt, verifyJwt, decodeJwt, decodeJwtHeader } from '@5qtrs/jwt';
import { IAccountDataContext, Id, IdType, IUser, IClient, AccountDataException } from '@5qtrs/account-data';
import { AccountConfig } from './AccountConfig';

// ------------------
// Internal Constants
// ------------------

const expireInSeconds = 60 * 60 * 8; // 8 hours
const jwtAlgorithm = 'HS256';
const issuerSegmentLength = 8;
const subjectSegmentLength = 8;
const jwtSecretLength = 64;

// ------------------
// Internal Functions
// ------------------

function getDomainFromBaseUrl(baseUrl: string): string {
  let domain = baseUrl.toLowerCase();
  domain = domain.replace('https://', '').replace('http://', '');
  const indexOfPort = domain.indexOf(':');
  if (indexOfPort !== -1) {
    domain = domain.substring(0, indexOfPort);
  }

  const indexOfForwardSlash = domain.indexOf('/');
  if (indexOfForwardSlash !== -1) {
    domain = domain.substring(0, indexOfForwardSlash);
  }

  return domain;
}

function generateIssuerId(agentId: string, baseUrl: string): string {
  const domain = getDomainFromBaseUrl(baseUrl);
  return `${random({ lengthInBytes: issuerSegmentLength / 2 })}.${agentId}.${domain}`;
}

function generateSubject(): string {
  return `cli-${random({ lengthInBytes: subjectSegmentLength / 2 })}`;
}

// -------------------
// Exported Interfaces
// -------------------

export interface ILegacyPKIInitEntry {
  accountId: string;
  agentId: string;
  baseUrl: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

export function isILegacyPKIInitEntry(o: any): o is ILegacyPKIInitEntry {
  return o && typeof o === 'object' && typeof o.protocol === 'undefined';
}

export interface IPKIInitEntry {
  agentId: string;
  protocol: string;
  profile: {
    id?: string;
    displayName?: string;
    baseUrl: string;
    account: string;
    subscription?: string;
    boundary?: string;
    function?: string;
  };
}

export function isIPKIInitEntry(o: any): o is IPKIInitEntry {
  return o && typeof o === 'object' && o.protocol === 'pki';
}

export interface IOauthInitEntry {
  agentId: string;
  protocol: string;
  profile: {
    id?: string;
    displayName?: string;
    baseUrl: string;
    account: string;
    subscription?: string;
    boundary?: string;
    function?: string;
    oauth: {
      webAuthorizationUrl?: string;
      webClientId?: string;
      webLogoutUrl?: string;
      deviceAuthorizationUrl?: string;
      deviceClientId?: string;
      tokenUrl?: string;
    };
  };
}

export function isIOauthInitEntry(o: any): o is IOauthInitEntry {
  return o && typeof o === 'object' && o.protocol === 'oauth';
}

export interface ILegacyPKIInitResolve {
  publicKey: string;
  keyId: string;
  initToken: string;
}

function isILegacyPKIInitResolve(o: any): o is ILegacyPKIInitResolve {
  return (
    o &&
    typeof o === 'object' &&
    typeof o.publicKey === 'string' &&
    typeof o.keyId === 'string' &&
    typeof o.initToken === 'string'
  );
}

export interface IInitResolve {
  protocol: string;
  accessToken: string;
  decodedAccessToken: any;
  initToken: string;
  publicKey?: string;
}

function isIInitResolve(o: any): o is IInitResolve {
  return (
    o &&
    typeof o === 'object' &&
    typeof o.protocol === 'string' &&
    typeof o.accessToken === 'string' &&
    typeof o.decodedAccessToken === 'object' &&
    typeof o.initToken === 'string' &&
    (o.protocol !== 'pki' || typeof o.publicKey === 'string')
  );
}

// ----------------
// Exported Classes
// ----------------

export class Init {
  private config: AccountConfig;
  private dataContext: IAccountDataContext;

  private constructor(config: AccountConfig, dataContext: IAccountDataContext) {
    this.config = config;
    this.dataContext = dataContext;
  }

  public static async create(config: AccountConfig, dataContext: IAccountDataContext) {
    return new Init(config, dataContext);
  }

  public async init(initEntry: ILegacyPKIInitEntry | IPKIInitEntry | IOauthInitEntry): Promise<string> {
    const jwtSecret = random({ lengthInBytes: jwtSecretLength / 2 }) as string;

    let payload: any;

    if (isILegacyPKIInitEntry(initEntry)) {
      await this.dataContext.agentData.init(initEntry.accountId, initEntry.agentId, jwtSecret);
      payload = {
        // legacy pki
        accountId: initEntry.accountId,
        agentId: initEntry.agentId,
        subscriptionId: initEntry.subscriptionId || undefined,
        boundaryId: initEntry.boundaryId || undefined,
        functionId: initEntry.functionId || undefined,
        baseUrl: initEntry.baseUrl,
        issuerId: generateIssuerId(initEntry.agentId, initEntry.baseUrl),
        subject: generateSubject(),
        iss: this.config.jwtIssuer,
        aud: this.config.jwtAudience,
      };
    } else if (isIPKIInitEntry(initEntry) || isIOauthInitEntry(initEntry)) {
      await this.dataContext.agentData.init(initEntry.profile.account, initEntry.agentId, jwtSecret);
      payload = {
        // oauth
        protocol: initEntry.protocol,
        agentId: initEntry.agentId,
        profile: initEntry.profile,
        iss: this.config.jwtIssuer,
        aud: this.config.jwtAudience,
      };
      if (isIPKIInitEntry(initEntry)) {
        payload.profile.issuerId = generateIssuerId(initEntry.agentId, initEntry.profile.baseUrl);
        payload.profile.subject = generateSubject();
      }
    } else {
      throw new Error('Unsupported format of initialization entry');
    }

    const options = {
      algorithm: jwtAlgorithm,
      expiresIn: expireInSeconds,
    };

    return signJwt(payload, jwtSecret, options);
  }

  public async resolve(accountId: string, initResolve: ILegacyPKIInitResolve | IInitResolve): Promise<IUser | IClient> {
    let decodedAccessTokenHeader: any;
    const decodedJwt = await decodeJwt(initResolve.initToken);
    if (!decodedJwt) {
      throw AccountDataException.invalidJwt(new Error('Unable to decode the init token'));
    }

    if (!decodedJwt.agentId) {
      throw AccountDataException.invalidJwt(new Error("The init token is missing the 'agentId' field"));
    }
    if (isILegacyPKIInitResolve(initResolve)) {
      // legacy PKI format
      if (!decodedJwt.accountId) {
        throw AccountDataException.invalidJwt(new Error("The init token is missing the 'accountId' field"));
      }
      if (accountId !== decodedJwt.accountId) {
        throw AccountDataException.invalidJwt(
          new Error("The 'accountId' value in the init token not match the 'accountId' in the URL")
        );
      }
    } else {
      // PKI or OAuth init entry in the current format
      if (!decodedJwt.profile) {
        throw AccountDataException.invalidJwt(new Error("The init token is missing the 'profile' field"));
      }
      if (!decodedJwt.profile.account) {
        throw AccountDataException.invalidJwt(new Error("The init token is missing the 'profile.account' field"));
      }
      if (accountId !== decodedJwt.profile.account) {
        throw AccountDataException.invalidJwt(
          new Error("The 'profile.account' value in the init token does not match the 'accountId' in the URL")
        );
      }
      if (initResolve.protocol !== decodedJwt.protocol) {
        throw AccountDataException.invalidJwt(
          new Error("The 'protocol' value in the init token does not match the 'protocol' value of the request")
        );
      }
      if (initResolve.protocol === 'pki') {
        if (decodedJwt.profile.issuerId !== initResolve.decodedAccessToken.iss) {
          throw AccountDataException.invalidJwt(
            new Error("The 'profile.issuerId' in the init token does not match the 'iss' claim of the accessToken")
          );
        }
        if (decodedJwt.profile.subject !== initResolve.decodedAccessToken.sub) {
          throw AccountDataException.invalidJwt(
            new Error("The 'profile.subject' in the init token does not match the 'sub' claim of the accessToken")
          );
        }
        decodedAccessTokenHeader = decodeJwtHeader(initResolve.accessToken);
        if (!decodedAccessTokenHeader || typeof decodedAccessTokenHeader.kid !== 'string') {
          throw AccountDataException.invalidJwt(
            new Error("The accessToken token is missing the 'kid' field in the header")
          );
        }
      }
    }

    const jwtSecret = await this.dataContext.agentData.resolve(accountId, decodedJwt.agentId);

    try {
      await verifyJwt(initResolve.initToken, jwtSecret, {
        algorithms: [jwtAlgorithm],
        audience: this.config.jwtAudience,
        issuer: this.config.jwtIssuer,
      });
    } catch (error) {
      throw AccountDataException.invalidJwt(error);
    }

    const idType = Id.getIdType(decodedJwt.agentId);
    const data = idType === IdType.user ? this.dataContext.userData : this.dataContext.clientData;
    const agent = await data.get(accountId, decodedJwt.agentId);

    if (isILegacyPKIInitResolve(initResolve)) {
      // legacy PKI format
      const newIssuer = {
        displayName: `CLI for ${decodedJwt.agentId}`,
        id: decodedJwt.issuerId,
        publicKeys: [{ keyId: initResolve.keyId, publicKey: initResolve.publicKey }],
      };

      await this.dataContext.issuerData.add(accountId, newIssuer);

      agent.identities = agent.identities || [];
      agent.identities.push({ issuerId: decodedJwt.issuerId, subject: decodedJwt.subject });
    } else if (initResolve.protocol === 'oauth' || initResolve.protocol === 'pki') {
      // current PKI or OAuth format

      if (initResolve.protocol === 'pki') {
        // current PKI format
        const newIssuer = {
          displayName: `CLI for ${decodedJwt.agentId}`,
          id: initResolve.decodedAccessToken.iss as string,
          publicKeys: [{ keyId: decodedAccessTokenHeader.kid as string, publicKey: initResolve.publicKey as string }],
        };

        await this.dataContext.issuerData.add(accountId, newIssuer);
      }
      agent.identities = agent.identities || [];
      agent.identities.push({
        issuerId: initResolve.decodedAccessToken.iss,
        subject: initResolve.decodedAccessToken.sub,
      });
    } else {
      throw AccountDataException.invalidInitEntry();
    }

    return data.update(accountId, agent);
  }
}
