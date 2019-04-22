import { random } from '@5qtrs/random';
import { signJwt, verifyJwt, decodeJwt } from '@5qtrs/jwt';
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

function generateIssuer(agentId: string, baseUrl: string): string {
  const domain = getDomainFromBaseUrl(baseUrl);
  return `${random({ lengthInBytes: issuerSegmentLength / 2 })}.${agentId}.${domain}`;
}

function generateSubject(): string {
  return `cli-${random({ lengthInBytes: subjectSegmentLength / 2 })}`;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IInitEntry {
  accountId: string;
  agentId: string;
  baseUrl: string;
  subscriptionId?: string;
  boundaryId?: string;
  functionId?: string;
}

export interface IInitResolve {
  publicKey: string;
  keyId: string;
  jwt: string;
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

  public async init(initEntry: IInitEntry): Promise<string> {
    const jwtSecret = random({ lengthInBytes: jwtSecretLength / 2 }) as string;
    await this.dataContext.agentData.init(initEntry.accountId, initEntry.agentId, jwtSecret);

    const payload = {
      accountId: initEntry.accountId,
      agentId: initEntry.agentId,
      subscriptionId: initEntry.subscriptionId || undefined,
      boundaryId: initEntry.boundaryId || undefined,
      functionId: initEntry.functionId || undefined,
      baseUrl: initEntry.baseUrl,
      iss: generateIssuer(initEntry.agentId, initEntry.baseUrl),
      sub: generateSubject(),
    };

    const options = {
      algorithm: jwtAlgorithm,
      expiresIn: expireInSeconds,
    };

    return signJwt(payload, jwtSecret, options);
  }

  public async resolve(accountId: string, initResolve: IInitResolve): Promise<IUser | IClient> {
    const decodedJwt = await decodeJwt(initResolve.jwt);
    const jwtSecret = await this.dataContext.agentData.resolve(decodedJwt.accountId, decodedJwt.agentId);

    try {
      verifyJwt(initResolve.jwt, jwtSecret, { algorithms: [jwtAlgorithm] });
    } catch (error) {
      throw AccountDataException.invalidJwt(error);
    }

    const idType = Id.getIdType(decodedJwt.agentId);
    const data = idType === IdType.user ? this.dataContext.userData : this.dataContext.clientData;
    const agent = await data.get(accountId, decodedJwt.agentId);

    const newIssuer = {
      displayName: `CLI for ${decodedJwt.agentId}`,
      id: decodedJwt.iss,
      publicKeys: [{ keyId: initResolve.keyId, publicKey: initResolve.publicKey }],
    };

    await this.dataContext.issuerData.add(accountId, newIssuer);

    agent.identities = agent.identities || [];
    agent.identities.push({ iss: decodedJwt.iss, sub: decodedJwt.sub });

    return data.update(accountId, agent);
  }
}
