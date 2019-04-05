import { AwsDynamo } from '@5qtrs/aws-dynamo';
import { random } from '@5qtrs/random';
import { all } from 'async';
import { signJwt, verifyJwt, decodeJwt } from '@5qtrs/jwt';

// ------------------
// Internal Constants
// ------------------

const tableName = 'init';
const delimiter = ':';
const issuerSegmentLength = 8;
const subjectSegmentLength = 8;
const expireInSeconds = 60 * 60 * 8; // 8 hours
const jwtAlgorithm = 'HS256';

// ------------------
// Internal Functions
// ------------------

function toDynamoKey(accountId: string, agentId: string) {
  const initMap = [accountId, agentId].join(delimiter);
  return {
    initMap: { S: initMap },
  };
}

function toDynamoItem(initEntry: IInitEntry) {
  const item: any = toDynamoKey(initEntry.accountId, initEntry.agentId);
  item.ttl = { N: initEntry.ttl.toString() };
  item.jwtSecret = { S: initEntry.jwtSecret };
  return item;
}

function fromDynamoItem(item: any, full: boolean = false): IInitEntry {
  const initMap = item.initMap.S;
  const [accountId, agentId] = initMap.split(delimiter);
  return {
    accountId,
    agentId,
    jwtSecret: item.jwtSecret.S,
    ttl: parseInt(item.ttl.N),
  };
}

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
// Internal Interfaces
// -------------------

interface IInitEntry {
  accountId: string;
  agentId: string;
  jwtSecret: string;
  ttl: number;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IResolvedInitEntry {
  accountId: string;
  agentId: string;
  iss: string;
  sub: string;
}

// ----------------
// Exported Classes
// ----------------

export class InitStore {
  private dynamo: AwsDynamo;

  private constructor(dynamo: AwsDynamo) {
    this.dynamo = dynamo;
  }

  public static async create(dynamo: AwsDynamo) {
    return new InitStore(dynamo);
  }

  public async isSetup() {
    return this.dynamo.tableExists(tableName);
  }

  public async setup() {
    return this.dynamo.ensureTable({
      name: tableName,
      attributes: { initMap: 'S' },
      keys: ['initMap'],
      ttlAttribute: 'ttl',
    });
  }

  public async addInitEntry(accountId: string, agentId: string, baseUrl: string): Promise<string | undefined> {
    const expires = Date.now() + 1000 * expireInSeconds;
    const jwtSecret = random() as string;
    const initEntry = {
      accountId,
      agentId,
      ttl: expires,
      jwtSecret,
    };

    const item = toDynamoItem(initEntry);
    await this.dynamo.putItem(tableName, item);

    const payload = {
      accountId,
      agentId,
      baseUrl,
      iss: generateIssuer(agentId, baseUrl),
      sub: generateSubject(),
    };

    const options = {
      algorithm: jwtAlgorithm,
      expiresIn: expireInSeconds,
    };

    return signJwt(payload, jwtSecret, options);
  }

  public async resolveInitEntry(jwt: string): Promise<IResolvedInitEntry | undefined> {
    const decoded = await decodeJwt(jwt);

    const key = toDynamoKey(decoded.accountId, decoded.agentId);
    const item = await this.dynamo.getItem(tableName, key);
    this.dynamo.deleteItem(tableName, key);

    if (!item) {
      return undefined;
    }

    const initEntry = fromDynamoItem(item);
    if (!initEntry.ttl || initEntry.ttl < Date.now()) {
      return undefined;
    }

    if (decoded.agentId !== initEntry.agentId || decoded.accountId != initEntry.accountId) {
      return undefined;
    }

    try {
      verifyJwt(jwt, initEntry.jwtSecret, { algorithms: [jwtAlgorithm] });
    } catch (error) {
      return undefined;
    }

    const resolvedEntry = {
      accountId: decoded.accountId,
      agentId: decoded.agentId,
      iss: decoded.iss,
      sub: decoded.sub,
    };

    return resolvedEntry;
  }
}
