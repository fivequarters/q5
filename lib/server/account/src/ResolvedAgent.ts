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

import { findInternalIssuer, SystemAgent } from '@5qtrs/runas';

import { isSystemIssuer } from '@5qtrs/constants';

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

// ------------------
// Internal Functions
// ------------------

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
    ? findInternalIssuer(issuerId)
    : dataContext.issuerData.get(accountId, issuerId));

  let secretOrUrl;
  if (issuer.jsonKeysUrl) {
    secretOrUrl = issuer.jsonKeysUrl;
  } else if (issuer.publicKeys) {
    if (Array.isArray(issuer.publicKeys)) {
      for (const publicKey of issuer.publicKeys) {
        if (publicKey.keyId === kid) {
          secretOrUrl = publicKey.publicKey;
        }
      }
    } else {
      // Find keys in Dynamo for system issuers that aren't cached - should always return a key, even when
      // it's not found, to force an invalidJwt error.
      secretOrUrl = await issuer.publicKeys(kid);
    }
  }

  if (!secretOrUrl) {
    throw AccountDataException.noPublicKey(kid);
  }

  try {
    await verifyJwt(jwt, secretOrUrl, { audience, algorithms, issuer });
  } catch (error) {
    throw AccountDataException.invalidJwt(error);
  }
}

function doesResouceAuthorize(grantedResource: string, requestedResource: string) {
  return requestedResource.indexOf(grantedResource) === 0;
}

function doesActionAuthorize(grantedAction: string, requestedAction: string) {
  const grantedSegments = grantedAction.split(':');
  const requestedSegments = requestedAction.split(':');
  if (grantedAction === requestedAction) {
    return true;
  }
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
  const resourceAuth = doesResouceAuthorize(Resource.normalize(accessEntry.resource), resource);
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

  private constructor(dataContext: IAccountDataContext, accountId: string, agent: IAgent, identity: IIdentity) {
    this.dataContext = dataContext;
    this.accountId = accountId;
    this.agent = agent;
    this.identity = identity;
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
      return new ResolvedAgent(dataContext, accountId, rootAgent, rootAgent.identities[0]);
    }
    const decodedJwtPayload = ResolvedAgent.prevalidateAccessToken(jwt);
    const issuerId = decodedJwtPayload.iss;
    const subject = decodedJwtPayload.sub;
    const identity = { issuerId, subject };
    const audience = accountConfig.jwtAudience;

    const agentPromise = isSystemIssuer(issuerId)
      ? Promise.resolve(new SystemAgent(decodedJwtPayload))
      : dataContext.agentData.get(accountId, identity);
    /*
     * FUTURE: Interesect permissions encoded in the JWT with permisisons available to the client natively
     * to support limited-permissions minted by other issuers.
     */

    const validatePromise = validateJwt(dataContext, accountId, audience, jwt, issuerId);

    try {
      const agent = await cancelOnError(validatePromise, agentPromise);
      return new ResolvedAgent(dataContext, accountId, agent, identity);
    } catch (error) {
      if (error.code === AccountDataExceptionCode.noIssuer || error.code === AccountDataExceptionCode.noIdentity) {
        throw AccountDataException.unresolvedAgent(error);
      } else {
        throw error;
      }
    }
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
