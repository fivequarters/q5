import {
  IAccountDataContext,
  IAccessEntry,
  IAgent,
  Resource,
  IIdentity,
  AccountDataException,
  AccountDataExceptionCode,
} from '@5qtrs/account-data';
import { decodeJwt, decodeJwtHeader, verifyJwt } from '@5qtrs/jwt';
import { AccountConfig } from './AccountConfig';
import { cancelOnError } from '@5qtrs/promise';

import { InternalIssuerCache, SystemAgent } from '@5qtrs/runas';

import { JWT_PERMISSION_CLAIM, isSystemIssuer } from '@5qtrs/constants';

// ------------------
// Internal Constants
// ------------------

const algorithms = ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512'];
const rootAgent = {
  id: 'root-user',
  identities: [{ issuerId: 'root', subject: 'root' }],
  access: {
    allow: [{ action: '*', resource: '/' }],
  },
};

const internalIssuerCache = new InternalIssuerCache({});

// ------------------
// Internal Functions
// ------------------

function checkAltAudience(jwt: string): boolean {
  const aud = decodeJwt(jwt).aud;
  if (typeof aud === 'string') {
    return aud === process.env.JWT_ALT_AUDIENCE;
  }
  if (Array.isArray(aud)) {
    return aud.includes(process.env.JWT_ALT_AUDIENCE);
  }
  return false;
}

async function validateJwt(
  dataContext: IAccountDataContext,
  accountId: string,
  audience: string,
  jwt: string,
  issuerId: string
) {
  const decodedJwtHeader = decodeJwtHeader(jwt);
  const kid = decodedJwtHeader.kid;

  // Get either the system issuer or the actual issuer.
  const issuer = await (isSystemIssuer(issuerId)
    ? internalIssuerCache.findInternalIssuer(issuerId)
    : dataContext.issuerData.get(accountId, issuerId));

  let secretOrUrl;
  if (issuer.jsonKeysUrl) {
    secretOrUrl = issuer.jsonKeysUrl;
  } else if (issuer.publicKeys) {
    for (const publicKey of issuer.publicKeys) {
      if (publicKey.keyId === kid) {
        secretOrUrl = publicKey.publicKey;
      }
    }
  } else if (issuer.keyStore) {
    secretOrUrl = await issuer.keyStore(kid);
  }

  if (!secretOrUrl) {
    throw AccountDataException.noPublicKey(kid);
  }

  try {
    if (process.env.JWT_ALT_AUDIENCE && checkAltAudience(jwt)) {
      // Debugging only - allow a specified alternative audience for JWT validation.
      audience = process.env.JWT_ALT_AUDIENCE;
    }
    await verifyJwt(jwt, secretOrUrl, { audience, algorithms, issuer });
  } catch (error) {
    throw AccountDataException.invalidJwt(error);
  }
}

function doesResourceAuthorize(grantedResource: string, requestedResource: string) {
  return requestedResource.indexOf(grantedResource) === 0;
}

function doesActionAuthorize(grantedAction: string, requestedAction: string) {
  if (grantedAction === requestedAction) {
    return true;
  }

  const grantedSegments = grantedAction.split(':');
  const requestedSegments = requestedAction.split(':');

  for (let i = 0; i < requestedSegments.length; i++) {
    if (grantedSegments[i]) {
      if (grantedSegments[i] === '*') {
        return true;
      } else if (grantedSegments[i] === requestedSegments[i]) {
        // ok, continue to check the next segment
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  return false;
}

function doesAccessEntryAuthorize(accessEntry: IAccessEntry, action: string, resource: string) {
  const actionAuth = doesActionAuthorize(accessEntry.action, action);
  const resourceAuth = doesResourceAuthorize(Resource.normalize(accessEntry.resource), resource);
  return actionAuth && resourceAuth;
}

// ----------------
// Exported Classes
// ----------------

export class ResolvedAgent implements IAgent {
  private dataContext: IAccountDataContext;
  private accountId: string;
  private agent: IAgent;
  private identity: IIdentity;
  public decodedJwt: any;

  private constructor(
    dataContext: IAccountDataContext,
    accountId: string,
    agent: IAgent,
    identity: IIdentity,
    decodedJwt: any
  ) {
    this.dataContext = dataContext;
    this.accountId = accountId;
    this.agent = agent;
    this.identity = identity;
    this.decodedJwt = decodedJwt;
  }

  public static async create(
    accountConfig: AccountConfig,
    dataContext: IAccountDataContext,
    accountId: string,
    jwt: string,
    isRootAgent: boolean = false
  ) {
    if (isRootAgent) {
      accountId = accountId || 'root';
      return new ResolvedAgent(dataContext, accountId, rootAgent, rootAgent.identities[0], {});
    }
    const decodedJwtPayload = ResolvedAgent.prevalidateAccessToken(jwt);
    const issuerId = decodedJwtPayload.iss;
    const subject = decodedJwtPayload.sub;
    const identity = { issuerId, subject };
    const audience = accountConfig.jwtAudience;

    const agentPromise = isSystemIssuer(issuerId)
      ? Promise.resolve(new SystemAgent(decodedJwtPayload))
      : dataContext.agentData.get(accountId, identity);

    const validatePromise = validateJwt(dataContext, accountId, audience, jwt, issuerId);

    try {
      const agent = await cancelOnError(validatePromise, agentPromise);
      const resolvedAgent = new ResolvedAgent(dataContext, accountId, agent, identity, decodedJwtPayload);

      // Non-system issuers presenting claims must only present claims that are a subset of the resolved
      // agent's permissions.  If the presented claims exceed the agent's permissions, an error will be
      // thrown.
      if (!isSystemIssuer(issuerId) && decodedJwtPayload[JWT_PERMISSION_CLAIM]) {
        await resolvedAgent.checkPermissionSubset(decodedJwtPayload[JWT_PERMISSION_CLAIM]);
        resolvedAgent.agent.access = decodedJwtPayload[JWT_PERMISSION_CLAIM];
      }

      return resolvedAgent;
    } catch (error) {
      if (error.code === AccountDataExceptionCode.noIssuer || error.code === AccountDataExceptionCode.noIdentity) {
        throw AccountDataException.unresolvedAgent(error);
      } else {
        throw error;
      }
    }
  }

  private static prevalidateInlinePermissions(inlinePermissions: IAccessEntry[]) {
    inlinePermissions?.forEach((inlinePermission: IAccessEntry) => {
      if (!inlinePermission?.action || !inlinePermission?.resource) {
        throw AccountDataException.invalidJwt(new Error('Malformed inline permission'));
      }
    });
  }

  private static prevalidateAccessToken(jwt: string) {
    const decodedJwtPayload = decodeJwt(jwt);
    if (!decodedJwtPayload) {
      throw AccountDataException.invalidJwt(new Error('Unable to decode JWT'));
    }
    if (!decodedJwtPayload.iss) {
      throw AccountDataException.invalidJwt(new Error("JWT does not have 'iss' claim"));
    }
    if (!decodedJwtPayload.sub) {
      throw AccountDataException.invalidJwt(new Error("JWT does not have 'sub' claim"));
    }
    if (decodedJwtPayload[JWT_PERMISSION_CLAIM]?.allow) {
      ResolvedAgent.prevalidateInlinePermissions(decodedJwtPayload[JWT_PERMISSION_CLAIM]?.allow);
    }
    return decodedJwtPayload;
  }

  public static async validateAccessTokenSignature(jwt: string, publicKey: string) {
    const decodedJwtPayload = ResolvedAgent.prevalidateAccessToken(jwt);

    try {
      await verifyJwt(jwt, publicKey, { algorithms });
    } catch (error) {
      throw AccountDataException.invalidJwt(error);
    }

    return decodedJwtPayload;
  }

  public static async validateAccessToken(
    accountConfig: AccountConfig,
    dataContext: IAccountDataContext,
    accountId: string,
    jwt: string
  ) {
    const decodedJwtPayload = ResolvedAgent.prevalidateAccessToken(jwt);
    const issuerId = decodedJwtPayload.iss;
    const audience = accountConfig.jwtAudience;

    await validateJwt(dataContext, accountId, audience, jwt, issuerId);
    return decodedJwtPayload;
  }

  public isAuthorized(action: string, resource: string) {
    const accessEntries = this.agent.access && this.agent.access.allow ? this.agent.access.allow : [];

    resource = Resource.normalize(resource);
    for (const accessEntry of accessEntries) {
      if (doesAccessEntryAuthorize(accessEntry, action, resource)) {
        return true;
      }
    }
    return false;
  }

  public async ensureAuthorized(action: string, resource: string): Promise<void> {
    resource = Resource.normalize(resource);
    const authorized = this.isAuthorized(action, resource);
    await this.addAuditEntry(action, resource, authorized);
    if (!authorized) {
      throw AccountDataException.unauthorized(this.id as string, action, resource);
    }
  }

  public async checkPermissionSubset(permissions: any) {
    if (permissions.allow) {
      return Promise.all(permissions.allow.map((entry: any) => this.ensureAuthorized(entry.action, entry.resource)));
    }
  }

  public get id() {
    return this.agent.id;
  }

  public get identities() {
    const { issuerId, subject } = this.identity;
    return [{ issuerId, subject }];
  }

  public get access() {
    const accessEntries = this.agent.access && this.agent.access.allow ? this.agent.access.allow : [];
    const allow = accessEntries.map((accessEntry) => {
      const { action, resource } = accessEntry;
      return { action, resource };
    });

    return { allow };
  }

  public async addAuditEntry(action: string, resource: string, authorized: boolean): Promise<void> {
    const auditEntry = {
      accountId: this.accountId,
      issuerId: this.identity.issuerId,
      subject: this.identity.subject,
      action,
      resource,
      authorized,
    };
    await this.dataContext.auditData.add(auditEntry);
  }
}
